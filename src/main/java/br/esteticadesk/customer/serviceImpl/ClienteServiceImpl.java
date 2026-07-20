package br.esteticadesk.customer.serviceImpl;

import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.dto.ClienteDetalheDTO;
import br.esteticadesk.customer.dto.ClienteListagemDTO;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.mapper.ClienteMapper;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.customer.service.ClienteService;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.exception.CpfJaCadastradoException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.validation.DocumentoValidator;
import br.esteticadesk.vehicle.service.VeiculoService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClienteServiceImpl implements ClienteService {
    private final ClienteRepository repository;
    private final ClienteMapper mapper;
    private final SessaoUsuario sessao;
    private final AgendamentoRepository agendamentos;
    private final VeiculoService veiculoService;
    private final ReceitaRepository receitas;

    public ClienteServiceImpl(ClienteRepository repository, ClienteMapper mapper, SessaoUsuario sessao,
            AgendamentoRepository agendamentos, VeiculoService veiculoService, ReceitaRepository receitas) {
        this.repository = repository;
        this.mapper = mapper;
        this.sessao = sessao;
        this.agendamentos = agendamentos;
        this.veiculoService = veiculoService;
        this.receitas = receitas;
    }

    public ClienteDTO salvar(ClienteDTO dto) {
        var empresaId = sessao.empresaObrigatoria();
        validarDocumento(dto.cpfCnpj(), empresaId, null);
        Cliente entity = mapper.paraEntidade(dto);
        entity.setEmpresaId(empresaId);
        entity.setAtivo(true);
        normalizar(entity);
        return mapper.paraDto(repository.save(entity));
    }

    @Override
    public ClienteDTO atualizar(Long id, ClienteDTO dto) {
        var empresaId = sessao.empresaObrigatoria();
        var cliente = buscarEntidade(id, empresaId);
        validarDocumento(dto.cpfCnpj(), empresaId, id);
        mapper.atualizarEntidade(dto, cliente);
        normalizar(cliente);
        return mapper.paraDto(repository.save(cliente));
    }

    @Override
    @Transactional(readOnly = true)
    public ClienteDTO buscarPorId(Long id) {
        return mapper.paraDto(buscarEntidade(id, sessao.empresaObrigatoria()));
    }

    @Override
    @Transactional(readOnly = true)
    public ClienteDetalheDTO buscarDetalhe(Long id) {
        var empresaId = sessao.empresaObrigatoria();
        var cliente = mapper.paraDto(buscarEntidade(id, empresaId));
        var status = StatusAgendamento.CONCLUIDO;
        var ultimo = agendamentos.findUltimoAtendimento(empresaId, id, status).orElse(null);
        var total = agendamentos.countByClienteAndStatus(empresaId, id, status);
        var gasto = agendamentos.sumTotalByClienteAndStatus(empresaId, id, status);
        var veiculos = veiculoService.listarPorCliente(id, true);
        var historicoFinanceiro = receitas.findByEmpresaIdAndAgendamentoClienteIdOrderByDataRecebimentoDesc(empresaId, id);
        return new ClienteDetalheDTO(cliente, ultimo, total, gasto == null ? BigDecimal.ZERO : gasto, veiculos,
                historicoFinanceiro);
    }

    public ClienteDTO inativar(Long id) {
        var cliente = buscarEntidade(id, sessao.empresaObrigatoria());
        cliente.setAtivo(false);
        return mapper.paraDto(repository.save(cliente));
    }

    @Override
    public ClienteDTO reativar(Long id) {
        var cliente = buscarEntidade(id, sessao.empresaObrigatoria());
        cliente.setAtivo(true);
        return mapper.paraDto(repository.save(cliente));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClienteListagemDTO> listar(String busca, Boolean ativo, String ordenacao) {
        var empresaId = sessao.empresaObrigatoria();
        var termo = busca == null ? "" : busca.trim();
        var termoNumerico = somenteDigitos(termo);
        var filtroAtivo = ativo == null || ativo ? Boolean.TRUE : null;
        var clientes = repository.buscar(empresaId, termo, termoNumerico == null ? "" : termoNumerico, filtroAtivo);
        var ids = clientes.stream().map(Cliente::getId).toList();
        var ultimos = carregarUltimosAtendimentos(empresaId, ids);
        var totais = carregarTotaisAtendimentos(empresaId, ids);
        var gastos = carregarGastos(empresaId, ids);
        var lista = clientes.stream()
                .map(cliente -> new ClienteListagemDTO(
                        cliente.getId(),
                        cliente.getNome(),
                        cliente.getTelefone(),
                        cliente.getCpfCnpj(),
                        cliente.getVeiculos().size(),
                        Boolean.TRUE.equals(cliente.getAtivo()),
                        ultimos.get(cliente.getId()),
                        totais.getOrDefault(cliente.getId(), 0L),
                        gastos.getOrDefault(cliente.getId(), BigDecimal.ZERO)))
                .sorted(comparadorOrdenacao(ordenacao))
                .toList();
        return lista;
    }

    private Comparator<ClienteListagemDTO> comparadorOrdenacao(String ordenacao) {
        var criterio = ordenacao == null || ordenacao.isBlank() ? "nome" : ordenacao.trim().toLowerCase(Locale.ROOT);
        return switch (criterio) {
            case "ultimo_atendimento" -> Comparator.comparing(
                    ClienteListagemDTO::ultimoAtendimento, Comparator.nullsLast(Comparator.reverseOrder()));
            case "valor_gasto" -> Comparator.comparing(
                    cliente -> cliente.valorTotalGasto() == null ? BigDecimal.ZERO : cliente.valorTotalGasto(),
                    Comparator.reverseOrder());
            case "relacionamento" -> Comparator.comparing(ClienteListagemDTO::relacionamento);
            default -> Comparator.comparing(cliente -> cliente.nome().toLowerCase(Locale.ROOT));
        };
    }

    private Map<Long, LocalDateTime> carregarUltimosAtendimentos(Long empresaId, List<Long> clienteIds) {
        Map<Long, LocalDateTime> mapa = new HashMap<>();
        if (clienteIds.isEmpty()) {
            return mapa;
        }
        for (Object[] linha : agendamentos.findUltimosAtendimentosPorClientes(empresaId, clienteIds,
                StatusAgendamento.CONCLUIDO)) {
            mapa.put((Long) linha[0], (LocalDateTime) linha[1]);
        }
        return mapa;
    }

    private Map<Long, Long> carregarTotaisAtendimentos(Long empresaId, List<Long> clienteIds) {
        Map<Long, Long> mapa = new HashMap<>();
        if (clienteIds.isEmpty()) {
            return mapa;
        }
        for (Object[] linha : agendamentos.countAtendimentosPorClientes(empresaId, clienteIds,
                StatusAgendamento.CONCLUIDO)) {
            mapa.put((Long) linha[0], (Long) linha[1]);
        }
        return mapa;
    }

    private Map<Long, BigDecimal> carregarGastos(Long empresaId, List<Long> clienteIds) {
        Map<Long, BigDecimal> mapa = new HashMap<>();
        if (clienteIds.isEmpty()) {
            return mapa;
        }
        for (Object[] linha : agendamentos.sumGastosPorClientes(empresaId, clienteIds,
                StatusAgendamento.CONCLUIDO)) {
            mapa.put((Long) linha[0], (BigDecimal) linha[1]);
        }
        return mapa;
    }

    private Cliente buscarEntidade(Long id, Long empresaId) {
        return repository.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrado."));
    }

    private void validarDocumento(String cpfCnpj, Long empresaId, Long id) {
        if (!DocumentoValidator.cpfOuCnpjValido(cpfCnpj))
            throw new IllegalArgumentException("CPF/CNPJ inválido.");
        var documento = somenteDigitos(cpfCnpj);
        if (documento != null && repository.existeCpfCnpjNormalizado(empresaId, documento, id))
            throw new CpfJaCadastradoException();
    }

    private void normalizar(Cliente cliente) {
        cliente.setNome(textoObrigatorio(cliente.getNome(), "Nome é obrigatório."));
        cliente.setCpfCnpj(somenteDigitos(cliente.getCpfCnpj()));
        var telefone = somenteDigitos(cliente.getTelefone());
        if (telefone == null)
            throw new IllegalArgumentException("Telefone é obrigatório.");
        if (telefone.length() != 10 && telefone.length() != 11)
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 dígitos.");
        cliente.setTelefone(telefone);
        var email = textoOpcional(cliente.getEmail());
        cliente.setEmail(email == null ? null : email.toLowerCase(Locale.ROOT));
        var cep = somenteDigitos(cliente.getCep());
        if (cep != null && cep.length() != 8)
            throw new IllegalArgumentException("CEP deve conter 8 dígitos.");
        cliente.setCep(cep);
        cliente.setLogradouro(textoOpcional(cliente.getLogradouro()));
        cliente.setNumero(textoOpcional(cliente.getNumero()));
        cliente.setComplemento(textoOpcional(cliente.getComplemento()));
        cliente.setBairro(textoOpcional(cliente.getBairro()));
        cliente.setCidade(textoOpcional(cliente.getCidade()));
        var uf = textoOpcional(cliente.getUf());
        cliente.setUf(uf == null ? null : uf.toUpperCase(Locale.ROOT));
    }

    private String somenteDigitos(String valor) {
        var texto = textoOpcional(valor);
        return texto == null ? null : texto.replaceAll("\\D", "");
    }

    private String textoOpcional(String valor) {
        if (valor == null || valor.isBlank())
            return null;
        return valor.trim();
    }

    private String textoObrigatorio(String valor, String mensagem) {
        var texto = textoOpcional(valor);
        if (texto == null)
            throw new IllegalArgumentException(mensagem);
        return texto;
    }
}
