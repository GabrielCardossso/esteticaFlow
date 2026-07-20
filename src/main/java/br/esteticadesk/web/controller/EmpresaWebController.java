package br.esteticadesk.web.controller;

import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.settings.service.ConfiguracaoService;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/empresas")
public class EmpresaWebController {

    private final ConfiguracaoService configuracoes;
    private final AssinaturaService assinaturas;

    public EmpresaWebController(ConfiguracaoService configuracoes, AssinaturaService assinaturas) {
        this.configuracoes = configuracoes;
        this.assinaturas = assinaturas;
    }

    @GetMapping
    public String index(@RequestParam(defaultValue = "false") boolean mostrarTodas,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) PlanoAssinatura plano, Model model) {
        var empresas = configuracoes.listarEmpresas(mostrarTodas, busca, plano);
        empresas.forEach(empresa -> assinaturas.recalcularSituacao(empresa, LocalDate.now()));
        model.addAttribute("empresas", empresas);
        model.addAttribute("planos", PlanoAssinatura.values());
        model.addAttribute("mostrarTodas", mostrarTodas);
        model.addAttribute("busca", busca);
        model.addAttribute("planoFiltro", plano);
        model.addAttribute("menuAtivo", "empresas");
        return "company/index";
    }

    @PostMapping
    public String criar(@RequestParam String razaoSocial, @RequestParam String nomeFantasia,
            @RequestParam String cnpj, @RequestParam(required = false) String telefone,
            @RequestParam(required = false) String email, @RequestParam String adminNome,
            @RequestParam String adminEmail, @RequestParam String adminSenha,
            @RequestParam PlanoAssinatura plano, @RequestParam(required = false) BigDecimal valorMensalidade,
            @RequestParam LocalDate proximoVencimento, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracoes.criarEmpresa(razaoSocial, nomeFantasia, cnpj, telefone, email,
                adminNome, adminEmail, adminSenha, plano, valorMensalidade, proximoVencimento),
                "Empresa criada com administrador inicial.", redirectAttributes);
    }

    @PostMapping("/{id}/assinatura")
    public String atualizarAssinatura(@PathVariable Long id, @RequestParam PlanoAssinatura plano,
            @RequestParam BigDecimal valorMensalidade, @RequestParam LocalDate proximoVencimento,
            RedirectAttributes redirectAttributes) {
        return executar(() -> assinaturas.atualizarPlano(id, plano, valorMensalidade, proximoVencimento),
                "Assinatura atualizada.", redirectAttributes);
    }

    @PostMapping("/{id}/pagamento")
    public String registrarPagamento(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> assinaturas.registrarPagamento(id), "Pagamento registrado.", redirectAttributes);
    }

    @PostMapping("/{id}/bloquear")
    public String bloquear(@PathVariable Long id, @RequestParam String motivo,
            @RequestParam(defaultValue = "false") boolean manual, RedirectAttributes redirectAttributes) {
        return executar(() -> assinaturas.bloquear(id, motivo, manual), "Empresa bloqueada.", redirectAttributes);
    }

    @PostMapping("/{id}/desbloquear")
    public String desbloquear(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> assinaturas.desbloquear(id), "Empresa desbloqueada.", redirectAttributes);
    }

    @PostMapping("/{id}/inativar")
    public String inativar(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean mostrarTodas,
            RedirectAttributes redirectAttributes) {
        redirectAttributes.addAttribute("mostrarTodas", mostrarTodas);
        return executar(() -> assinaturas.inativar(id), "Empresa inativada e assinatura cancelada.",
                redirectAttributes);
    }

    @PostMapping("/{id}/reativar")
    public String reativar(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean mostrarTodas,
            RedirectAttributes redirectAttributes) {
        redirectAttributes.addAttribute("mostrarTodas", mostrarTodas);
        return executar(() -> assinaturas.reativar(id), "Empresa reativada.", redirectAttributes);
    }

    private String executar(Runnable acao, String sucesso, RedirectAttributes redirectAttributes) {
        try {
            acao.run();
            redirectAttributes.addFlashAttribute("sucesso", sucesso);
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/empresas";
    }
}
