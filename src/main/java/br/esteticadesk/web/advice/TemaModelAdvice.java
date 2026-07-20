package br.esteticadesk.web.advice;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAssinatura;
import br.esteticadesk.notification.service.NotificacaoService;
import br.esteticadesk.settings.service.ConfiguracaoService;
import java.time.LocalDate;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class TemaModelAdvice {

    private final SessaoUsuario sessao;
    private final ConfiguracaoService configuracaoService;
    private final AssinaturaService assinaturas;
    private final NotificacaoService notificacoes;

    public TemaModelAdvice(SessaoUsuario sessao, ConfiguracaoService configuracaoService,
            AssinaturaService assinaturas, NotificacaoService notificacoes) {
        this.sessao = sessao;
        this.configuracaoService = configuracaoService;
        this.assinaturas = assinaturas;
        this.notificacoes = notificacoes;
    }

    @ModelAttribute("temaCor")
    public String temaCor() {
        if (sessao.getEmpresaId() == null) {
            return "teal";
        }
        return configuracaoService.temaCor();
    }

    @ModelAttribute("marca")
    public String marca() {
        return "EsteticaFlow";
    }

    @ModelAttribute("notificacoesNaoLidas")
    public long notificacoesNaoLidas() {
        if (sessao.getEmpresaId() == null) {
            return 0;
        }
        try {
            return notificacoes.contarNaoLidas();
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    @ModelAttribute
    public void recursosPlano(Model model) {
        if (sessao.getEmpresaId() == null) {
            model.addAttribute("recursosPlano", java.util.Set.of());
            model.addAttribute("superAdmin", false);
            model.addAttribute("podeRelatorios", false);
            model.addAttribute("podeExcel", false);
            return;
        }
        var recursos = assinaturas.recursosAtuais();
        model.addAttribute("recursosPlano", recursos);
        model.addAttribute("podeEstoque", recursos.contains(RecursoPlano.ESTOQUE));
        model.addAttribute("podeFinanceiro", recursos.contains(RecursoPlano.FINANCEIRO));
        model.addAttribute("podeRelatorios", recursos.contains(RecursoPlano.RELATORIO_SIMPLES));
        model.addAttribute("podeExcel", recursos.contains(RecursoPlano.EXCEL));
        model.addAttribute("podePersonalizarTema", recursos.contains(RecursoPlano.PERSONALIZACAO_TEMA));
        model.addAttribute("superAdmin", sessao.isSuperAdmin());

        if (!sessao.isSuperAdmin()) {
            var empresa = assinaturas.empresaAtual();
            var dias = assinaturas.diasEmAtraso(empresa, LocalDate.now());
            model.addAttribute("assinaturaEmAtraso",
                    empresa.getStatusAssinatura() == StatusAssinatura.EM_ATRASO);
            model.addAttribute("diasAtrasoAssinatura", dias);
        }
    }
}
