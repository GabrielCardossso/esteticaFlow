package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.settings.service.ConfiguracaoService;
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

    public ConfiguracaoWebController(ConfiguracaoService configuracaoService, SessaoUsuario sessao) {
        this.configuracaoService = configuracaoService;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("empresa", configuracaoService.empresaAtual());
        model.addAttribute("usuarios", sessao.isAdministrador() ? configuracaoService.usuarios() : List.of());
        model.addAttribute("administrador", sessao.isAdministrador());
        model.addAttribute("formasPagamento", configuracaoService.formasPagamento());
        model.addAttribute("categorias", configuracaoService.categorias());
        model.addAttribute("menuAtivo", "configuracoes");
        return "settings/index";
    }

    @PostMapping("/empresa")
    public String salvarEmpresa(@ModelAttribute("empresa") br.esteticadesk.company.entity.Empresa empresa,
            RedirectAttributes redirectAttributes) {
        configuracaoService.salvarEmpresa(empresa);
        redirectAttributes.addFlashAttribute("sucesso", "Dados da empresa atualizados.");
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
        configuracaoService.criarFormaPagamento(nome);
        redirectAttributes.addFlashAttribute("sucesso", "Forma de pagamento criada.");
        return "redirect:/configuracoes";
    }

    @PostMapping("/categorias")
    public String criarCategoria(@RequestParam String nome, RedirectAttributes redirectAttributes) {
        configuracaoService.criarCategoria(nome);
        redirectAttributes.addFlashAttribute("sucesso", "Categoria criada.");
        return "redirect:/configuracoes";
    }
}
