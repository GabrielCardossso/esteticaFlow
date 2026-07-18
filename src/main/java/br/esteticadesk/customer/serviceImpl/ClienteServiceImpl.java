package br.esteticadesk.customer.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.dto.ClienteListagemDTO;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.mapper.ClienteMapper;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.customer.service.ClienteService;
import br.esteticadesk.exception.*;
import br.esteticadesk.validation.DocumentoValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClienteServiceImpl implements ClienteService {
    private final ClienteRepository repository;
    private final ClienteMapper mapper;
    private final SessaoUsuario sessao;

    public ClienteServiceImpl(ClienteRepository repository, ClienteMapper mapper, SessaoUsuario sessao) {
        this.repository = repository;
        this.mapper = mapper;
        this.sessao = sessao;
    }

    public ClienteDTO salvar(ClienteDTO dto) {
        var empresaId = sessao.empresaObrigatoria();
        if (!DocumentoValidator.cpfOuCnpjValido(dto.cpfCnpj()))
            throw new IllegalArgumentException("CPF/CNPJ inválido.");
        if (dto.cpfCnpj() != null && !dto.cpfCnpj().isBlank()
                && repository.existsByEmpresaIdAndCpfCnpjAndAtivoTrue(empresaId, dto.cpfCnpj()))
            throw new CpfJaCadastradoException();
        Cliente entity = mapper.paraEntidade(dto);
        entity.setEmpresaId(empresaId);
        if (entity.getAtivo() == null)
            entity.setAtivo(true);
        return mapper.paraDto(repository.save(entity));
    }

    public ClienteDTO inativar(Long id) {
        var cliente = repository.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrado."));
        cliente.setAtivo(false);
        return mapper.paraDto(repository.save(cliente));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClienteListagemDTO> listar(String busca, Boolean ativo) {
        var empresaId = sessao.empresaObrigatoria();
        var termo = busca == null ? "" : busca.trim();
        var filtroAtivo = ativo == null || ativo ? Boolean.TRUE : null;
        return repository.buscar(empresaId, termo, filtroAtivo).stream()
                .map(cliente -> new ClienteListagemDTO(
                        cliente.getId(),
                        cliente.getNome(),
                        cliente.getTelefone(),
                        cliente.getCpfCnpj(),
                        cliente.getVeiculos().size(),
                        Boolean.TRUE.equals(cliente.getAtivo())))
                .toList();
    }
}
