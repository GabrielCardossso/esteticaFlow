package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.SolicitacaoAlteracaoEmpresaService;
import br.esteticadesk.notification.service.NotificacaoService;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/notificacoes")
public class NotificacaoWebController {

    private final NotificacaoService notificacoes;
    private final SolicitacaoAlteracaoEmpresaService solicitacoes;
    private final EmpresaRepository empresas;
    private final SessaoUsuario sessao;

    public NotificacaoWebController(NotificacaoService notificacoes,
            SolicitacaoAlteracaoEmpresaService solicitacoes, EmpresaRepository empresas, SessaoUsuario sessao) {
        this.notificacoes = notificacoes;
        this.solicitacoes = solicitacoes;
        this.empresas = empresas;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("notificacoes", notificacoes.listar());
        model.addAttribute("menuAtivo", "notificacoes");
        if (sessao.isSuperAdmin()) {
            var pendentes = solicitacoes.listarPendentes();
            var nomes = new LinkedHashMap<Long, String>();
            var empresasAtuais = new LinkedHashMap<Long, Empresa>();
            var detalhes = new LinkedHashMap<Long, String>();
            for (var sol : pendentes) {
                empresas.findById(sol.getEmpresaId()).ifPresent(e -> {
                    nomes.put(sol.getId(), e.getNomeFantasia());
                    empresasAtuais.put(sol.getId(), e);
                    detalhes.put(sol.getId(), solicitacoes.descreverPedido(e, sol));
                });
            }
            model.addAttribute("solicitacoesPendentes", pendentes);
            model.addAttribute("nomesEmpresasSolicitacao", nomes);
            model.addAttribute("empresasAtuaisSolicitacao", empresasAtuais);
            model.addAttribute("detalhesSolicitacao", detalhes);
        }
        return "notification/index";
    }

    @PostMapping("/{id}/lida")
    public String marcarLida(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            notificacoes.marcarLida(id);
            redirectAttributes.addFlashAttribute("sucesso", "Notificação marcada como lida.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/notificacoes";
    }

    @PostMapping("/lidas")
    public String marcarTodas(RedirectAttributes redirectAttributes) {
        try {
            notificacoes.marcarTodasLidas();
            redirectAttributes.addFlashAttribute("sucesso", "Todas as notificações foram marcadas como lidas.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/notificacoes";
    }

    @PostMapping("/solicitacoes/{id}/aprovar")
    public String aprovar(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            solicitacoes.aprovar(id);
            redirectAttributes.addFlashAttribute("sucesso", "Solicitação aprovada e dados da empresa atualizados.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/notificacoes";
    }

    @PostMapping("/solicitacoes/{id}/rejeitar")
    public String rejeitar(@PathVariable Long id, @RequestParam(required = false) String motivo,
            RedirectAttributes redirectAttributes) {
        try {
            solicitacoes.rejeitar(id, motivo);
            redirectAttributes.addFlashAttribute("sucesso", "Solicitação rejeitada.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/notificacoes";
    }
}
