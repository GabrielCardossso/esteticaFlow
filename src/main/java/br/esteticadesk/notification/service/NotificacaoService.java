package br.esteticadesk.notification.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.customer.service.ClienteService;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.RelacionamentoCliente;
import br.esteticadesk.enums.StatusAssinatura;
import br.esteticadesk.enums.TipoNotificacao;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.service.EstoqueService;
import br.esteticadesk.notification.entity.Notificacao;
import br.esteticadesk.notification.repository.NotificacaoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificacaoService {

    private final NotificacaoRepository notificacoes;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;
    private final EstoqueService estoqueService;
    private final ClienteService clienteService;

    public NotificacaoService(NotificacaoRepository notificacoes, SessaoUsuario sessao,
            AssinaturaService assinaturas, EstoqueService estoqueService, ClienteService clienteService) {
        this.notificacoes = notificacoes;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
        this.estoqueService = estoqueService;
        this.clienteService = clienteService;
    }

    @Transactional(readOnly = true)
    public List<Notificacao> listar() {
        sincronizarAlertasTenant();
        if (sessao.isSuperAdmin()) {
            return notificacoes.findTop100ByEmpresaIdIsNullOrderByDataCriacaoDesc();
        }
        return notificacoes.findTop100ByEmpresaIdOrderByDataCriacaoDesc(sessao.empresaObrigatoria());
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas() {
        if (sessao.getEmpresaId() == null) {
            return 0;
        }
        if (sessao.isSuperAdmin()) {
            return notificacoes.countByEmpresaIdIsNullAndLidaFalse();
        }
        return notificacoes.countByEmpresaIdAndLidaFalse(sessao.empresaObrigatoria());
    }

    public void marcarLida(Long id) {
        var notif = buscarDoEscopo(id);
        notif.setLida(true);
    }

    public void marcarTodasLidas() {
        listar().stream().filter(n -> !Boolean.TRUE.equals(n.getLida())).forEach(n -> n.setLida(true));
    }

    public Notificacao notificarEmpresa(Long empresaId, TipoNotificacao tipo, String titulo, String mensagem,
            String referenciaTipo, Long referenciaId, String acaoUrl) {
        if (empresaId != null && referenciaTipo != null && referenciaId != null
                && notificacoes.existsByEmpresaIdAndTipoAndReferenciaTipoAndReferenciaIdAndLidaFalse(
                        empresaId, tipo, referenciaTipo, referenciaId)) {
            return null;
        }
        return salvar(empresaId, tipo, titulo, mensagem, referenciaTipo, referenciaId, acaoUrl);
    }

    public Notificacao notificarSuperAdmin(TipoNotificacao tipo, String titulo, String mensagem,
            String referenciaTipo, Long referenciaId, String acaoUrl) {
        if (referenciaTipo != null && referenciaId != null
                && notificacoes.existsByEmpresaIdIsNullAndTipoAndReferenciaTipoAndReferenciaIdAndLidaFalse(
                        tipo, referenciaTipo, referenciaId)) {
            return null;
        }
        return salvar(null, tipo, titulo, mensagem, referenciaTipo, referenciaId, acaoUrl);
    }

    private Notificacao salvar(Long empresaId, TipoNotificacao tipo, String titulo, String mensagem,
            String referenciaTipo, Long referenciaId, String acaoUrl) {
        var n = new Notificacao();
        n.setEmpresaId(empresaId);
        n.setTipo(tipo);
        n.setTitulo(titulo);
        n.setMensagem(mensagem);
        n.setLida(false);
        n.setReferenciaTipo(referenciaTipo);
        n.setReferenciaId(referenciaId);
        n.setAcaoUrl(acaoUrl);
        return notificacoes.save(n);
    }

    private void sincronizarAlertasTenant() {
        if (sessao.isSuperAdmin() || sessao.getEmpresaId() == null) {
            return;
        }
        var empresaId = sessao.empresaObrigatoria();
        var empresa = assinaturas.empresaAtual();

        if (empresa.getStatusAssinatura() == StatusAssinatura.EM_ATRASO) {
            notificarEmpresa(empresaId, TipoNotificacao.ASSINATURA,
                    "Assinatura em atraso",
                    "A assinatura da empresa está em atraso. Regularize o pagamento para evitar bloqueio.",
                    "EMPRESA", empresaId, "/configuracoes");
        }

        if (assinaturas.permite(RecursoPlano.ESTOQUE)) {
            var baixos = estoqueService.listarEstoques(false, null, true, "nome");
            for (Estoque estoque : baixos) {
                var produto = estoque.getProduto();
                if (produto == null) {
                    continue;
                }
                notificarEmpresa(empresaId, TipoNotificacao.ESTOQUE_BAIXO,
                        "Estoque baixo: " + produto.getNome(),
                        "Saldo atual " + estoque.getQuantidadeAtual()
                                + " (mínimo " + estoque.getQuantidadeMinima() + ").",
                        "PRODUTO", produto.getId(), "/estoque");
            }
        }

        var inativos = clienteService.listar(null, true, "relacionamento").stream()
                .filter(c -> c.relacionamento() == RelacionamentoCliente.INATIVO
                        || c.relacionamento() == RelacionamentoCliente.EM_RISCO)
                .limit(15)
                .toList();
        for (var cliente : inativos) {
            var rotulo = cliente.relacionamento().rotulo();
            notificarEmpresa(empresaId, TipoNotificacao.CLIENTE_INATIVO,
                    rotulo + ": " + cliente.nome(),
                    "Último atendimento: " + cliente.ultimoAtendimentoFormatado()
                            + ". Considere um contato de reativação.",
                    "CLIENTE", cliente.id(), "/clientes/" + cliente.id());
        }
    }

    private Notificacao buscarDoEscopo(Long id) {
        Long empresaEscopo = sessao.isSuperAdmin() ? null : sessao.empresaObrigatoria();
        return notificacoes.findByIdAndEscopo(id, empresaEscopo)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Notificação não encontrada."));
    }
}
