package br.esteticadesk.search.service;

import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.employee.repository.UsuarioRepository;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import br.esteticadesk.search.dto.BuscaGlobalDTO;
import br.esteticadesk.search.dto.BuscaGlobalDTO.GrupoResultado;
import br.esteticadesk.search.dto.BuscaGlobalDTO.ItemResultado;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BuscaGlobalService {

    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int LIMITE = 5;

    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;
    private final ClienteRepository clientes;
    private final VeiculoRepository veiculos;
    private final AgendamentoRepository agendamentos;
    private final ServicoRepository servicos;
    private final EstoqueRepository estoques;
    private final UsuarioRepository usuarios;

    public BuscaGlobalService(SessaoUsuario sessao, AssinaturaService assinaturas, ClienteRepository clientes,
            VeiculoRepository veiculos, AgendamentoRepository agendamentos, ServicoRepository servicos,
            EstoqueRepository estoques, UsuarioRepository usuarios) {
        this.sessao = sessao;
        this.assinaturas = assinaturas;
        this.clientes = clientes;
        this.veiculos = veiculos;
        this.agendamentos = agendamentos;
        this.servicos = servicos;
        this.estoques = estoques;
        this.usuarios = usuarios;
    }

    public BuscaGlobalDTO buscar(String termoBruto) {
        var termo = termoBruto == null ? "" : termoBruto.trim();
        if (termo.length() < 2) {
            return new BuscaGlobalDTO(termo, List.of());
        }

        var empresaId = sessao.empresaObrigatoria();
        var grupos = new ArrayList<GrupoResultado>();
        var termoLower = termo.toLowerCase(Locale.ROOT);

        try {
            var clientesEncontrados = clientes.buscar(empresaId, termo, somenteDigitos(termo), true).stream()
                    .limit(LIMITE)
                    .map(c -> new ItemResultado(c.getNome(),
                            c.getTelefone() == null ? "Cliente" : c.getTelefone(),
                            "/clientes/" + c.getId()))
                    .toList();
            if (!clientesEncontrados.isEmpty()) {
                grupos.add(new GrupoResultado("Clientes", clientesEncontrados));
            }
        } catch (RuntimeException ignored) {
            // Continua com demais categorias
        }

        try {
            var veiculosEncontrados = veiculos.buscar(empresaId, termo).stream()
                    .limit(LIMITE)
                    .map(v -> new ItemResultado(
                            safe(v.getMarca()) + " " + safe(v.getModelo()),
                            safe(v.getPlaca()) + (v.getCliente() != null ? " · " + v.getCliente().getNome() : ""),
                            v.getCliente() != null ? "/clientes/" + v.getCliente().getId() + "/editar" : "/clientes"))
                    .toList();
            if (!veiculosEncontrados.isEmpty()) {
                grupos.add(new GrupoResultado("Veiculos", veiculosEncontrados));
            }
        } catch (RuntimeException ignored) {
            // Continua
        }

        try {
            var hoje = HorarioSistema.hoje();
            var agenda = agendamentos.buscarResumoPorPeriodo(
                            empresaId, HorarioSistema.inicioDoDia(hoje.minusDays(7)),
                            HorarioSistema.fimDoDia(hoje.plusDays(30)))
                    .stream()
                    .filter(a -> a.getCliente() != null && (
                            contem(a.getCliente().getNome(), termo)
                                    || (a.getVeiculo() != null && (
                                    contem(a.getVeiculo().getPlaca(), termo)
                                            || contem(a.getVeiculo().getModelo(), termo)))))
                    .limit(LIMITE)
                    .map(a -> new ItemResultado(
                            a.getCliente().getNome(),
                            DATA_HORA.format(a.getDataHora()) + " · " + a.getStatus().rotulo(),
                            "/agenda/" + a.getId()))
                    .toList();
            if (!agenda.isEmpty()) {
                grupos.add(new GrupoResultado("Agendamentos", agenda));
            }
        } catch (RuntimeException ignored) {
            // Continua
        }

        try {
            var servicosEncontrados = servicos.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId).stream()
                    .filter(s -> contem(s.getNome(), termo) || contem(s.getDescricao(), termo))
                    .limit(LIMITE)
                    .map(s -> new ItemResultado(s.getNome(), "Servico", "/servicos/" + s.getId() + "/editar"))
                    .toList();
            if (!servicosEncontrados.isEmpty()) {
                grupos.add(new GrupoResultado("Servicos", servicosEncontrados));
            }
        } catch (RuntimeException ignored) {
            // Continua
        }

        try {
            if (assinaturas.permite(RecursoPlano.ESTOQUE)) {
                var produtos = estoques.findByEmpresaIdAndProdutoAtivoTrue(empresaId).stream()
                        .filter(e -> e.getProduto() != null && contem(e.getProduto().getNome(), termo))
                        .limit(LIMITE)
                        .map(e -> new ItemResultado(e.getProduto().getNome(),
                                "Saldo " + e.getQuantidadeAtual(),
                                "/estoque/produtos/" + e.getProduto().getId() + "/editar"))
                        .toList();
                if (!produtos.isEmpty()) {
                    grupos.add(new GrupoResultado("Produtos", produtos));
                }
            }
        } catch (RuntimeException ignored) {
            // Continua
        }

        try {
            if (sessao.isAdministrador()) {
                var funcs = usuarios.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId).stream()
                        .filter(u -> contem(u.getNome(), termo) || contem(u.getEmail(), termo))
                        .limit(LIMITE)
                        .map(u -> new ItemResultado(u.getNome(), u.getPapel().name(), "/configuracoes"))
                        .toList();
                if (!funcs.isEmpty()) {
                    grupos.add(new GrupoResultado("Usuarios", funcs));
                }
            }
        } catch (RuntimeException ignored) {
            // Continua
        }

        if (termoLower.contains("relatorio") || termoLower.contains("relatório")) {
            try {
                if (assinaturas.permite(RecursoPlano.RELATORIO_SIMPLES)) {
                    grupos.add(new GrupoResultado("Relatorios",
                            List.of(new ItemResultado("Relatorios gerenciais", "Abrir modulo", "/relatorios"))));
                }
            } catch (RuntimeException ignored) {
                // Continua
            }
        }

        return new BuscaGlobalDTO(termo, List.copyOf(grupos));
    }

    private boolean contem(String valor, String termo) {
        return valor != null && valor.toLowerCase(Locale.ROOT).contains(termo.toLowerCase(Locale.ROOT));
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    private String safe(String valor) {
        return valor == null ? "" : valor;
    }
}
