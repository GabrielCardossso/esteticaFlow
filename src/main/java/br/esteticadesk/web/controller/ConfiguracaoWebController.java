package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.settings.service.ConfiguracaoService;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/configuracoes")
public class ConfiguracaoWebController {

    private final ConfiguracaoService configuracaoService;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;

    public ConfiguracaoWebController(ConfiguracaoService configuracaoService, SessaoUsuario sessao,
            AssinaturaService assinaturas) {
        this.configuracaoService = configuracaoService;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("empresa", configuracaoService.empresaAtual());
        model.addAttribute("usuarios", sessao.isAdministradorEmpresa() ? configuracaoService.usuarios() : List.of());
        model.addAttribute("administrador", sessao.isAdministradorEmpresa());
        model.addAttribute("superAdmin", sessao.isSuperAdmin());
        model.addAttribute("formasPagamento", assinaturas.permite(RecursoPlano.FINANCEIRO)
                ? configuracaoService.formasPagamento() : List.of());
        model.addAttribute("categorias", assinaturas.permite(RecursoPlano.ESTOQUE)
                ? configuracaoService.categorias() : List.of());
        model.addAttribute("temaCor", configuracaoService.temaCor());
        model.addAttribute("papeis", Arrays.stream(PapelUsuario.values())
                .filter(p -> p != PapelUsuario.SUPER_ADMIN)
                .toList());
        model.addAttribute("menuAtivo", "configuracoes");
        return "settings/index";
    }

    @PostMapping("/empresa")
    public String salvarEmpresa(@ModelAttribute("empresa") br.esteticadesk.company.entity.Empresa empresa,
            RedirectAttributes redirectAttributes) {
        try {
            configuracaoService.salvarEmpresa(empresa);
            redirectAttributes.addFlashAttribute("sucesso", "Dados da empresa atualizados.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/configuracoes";
    }

    @PostMapping("/tema")
    public String salvarTema(@RequestParam String cor,
            RedirectAttributes redirectAttributes) {
        try {
            configuracaoService.salvarTema(cor);
            redirectAttributes.addFlashAttribute("sucesso", "Cor de destaque atualizada.");
            redirectAttributes.addFlashAttribute("temaCorFlash", cor);
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/configuracoes";
    }

    @PostMapping("/usuarios")
    public String criarUsuario(@RequestParam String nome, @RequestParam String email,
            @RequestParam String senha, @RequestParam PapelUsuario papel,
            RedirectAttributes redirectAttributes) {
        try {
            configuracaoService.criarUsuario(nome, email, senha, papel);
            redirectAttributes.addFlashAttribute("sucesso", "Usuário criado com sucesso.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/configuracoes";
    }

    @PostMapping("/formas-pagamento")
    public String criarFormaPagamento(@RequestParam String nome, RedirectAttributes redirectAttributes) {
        try {
            configuracaoService.criarFormaPagamento(nome);
            redirectAttributes.addFlashAttribute("sucesso", "Forma de pagamento criada.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/configuracoes";
    }

    @PostMapping("/categorias")
    public String criarCategoria(@RequestParam String nome, RedirectAttributes redirectAttributes) {
        try {
            configuracaoService.criarCategoria(nome);
            redirectAttributes.addFlashAttribute("sucesso", "Categoria criada.");
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/configuracoes";
    }
}
