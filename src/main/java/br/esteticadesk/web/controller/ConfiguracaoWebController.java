package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.company.service.SolicitacaoAlteracaoEmpresaService;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.settings.service.ConfiguracaoService;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final SolicitacaoAlteracaoEmpresaService solicitacoes;

    public ConfiguracaoWebController(ConfiguracaoService configuracaoService, SessaoUsuario sessao,
            AssinaturaService assinaturas, SolicitacaoAlteracaoEmpresaService solicitacoes) {
        this.configuracaoService = configuracaoService;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
        this.solicitacoes = solicitacoes;
    }

    @GetMapping
    public String index(@RequestParam(defaultValue = "false") boolean mostrarTodosUsuarios,
            @RequestParam(defaultValue = "false") boolean mostrarTodasFormas,
            @RequestParam(defaultValue = "false") boolean mostrarTodasCategorias, Model model) {
        model.addAttribute("empresa", configuracaoService.empresaAtual());
        model.addAttribute("usuarios", sessao.isAdministradorEmpresa()
                ? configuracaoService.usuarios(mostrarTodosUsuarios) : List.of());
        model.addAttribute("administrador", sessao.isAdministradorEmpresa());
        model.addAttribute("superAdmin", sessao.isSuperAdmin());
        model.addAttribute("formasPagamento", assinaturas.permite(RecursoPlano.FINANCEIRO)
                ? configuracaoService.formasPagamento(mostrarTodasFormas) : List.of());
        model.addAttribute("categorias", assinaturas.permite(RecursoPlano.ESTOQUE)
                ? configuracaoService.categorias(mostrarTodasCategorias) : List.of());
        model.addAttribute("mostrarTodosUsuarios", mostrarTodosUsuarios);
        model.addAttribute("mostrarTodasFormas", mostrarTodasFormas);
        model.addAttribute("mostrarTodasCategorias", mostrarTodasCategorias);
        model.addAttribute("temaCor", configuracaoService.temaCor());
        model.addAttribute("papeis", Arrays.stream(PapelUsuario.values())
                .filter(p -> p != PapelUsuario.SUPER_ADMIN)
                .toList());
        model.addAttribute("solicitacaoPendente", solicitacoes.pendenteDaEmpresaAtual());
        model.addAttribute("menuAtivo", "configuracoes");
        return "settings/index";
    }

    @PostMapping("/empresa")
    public String salvarEmpresa(@RequestParam String razaoSocial, @RequestParam String nomeFantasia,
            @RequestParam String cnpj, @RequestParam(required = false) String telefone,
            @RequestParam(required = false) String email,
            RedirectAttributes redirectAttributes) {
        try {
            if (sessao.isSuperAdmin()) {
                var empresa = new Empresa();
                empresa.setRazaoSocial(razaoSocial);
                empresa.setNomeFantasia(nomeFantasia);
                empresa.setCnpj(cnpj);
                empresa.setTelefone(telefone);
                empresa.setEmail(email);
                configuracaoService.salvarEmpresa(empresa);
                redirectAttributes.addFlashAttribute("sucesso", "Dados da empresa atualizados.");
            } else if (sessao.isAdministradorEmpresa()) {
                solicitacoes.solicitar(razaoSocial, nomeFantasia, cnpj, telefone, email);
                redirectAttributes.addFlashAttribute("sucesso",
                        "Solicitação enviada à EsteticaFlow. Aguarde a aprovação.");
            } else {
                redirectAttributes.addFlashAttribute("erro",
                        "Você não tem permissão para alterar os dados da empresa.");
            }
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

    @PostMapping("/usuarios/{id}")
    public String atualizarUsuario(@PathVariable Long id, @RequestParam String nome, @RequestParam String email,
            @RequestParam PapelUsuario papel, @RequestParam(required = false) String novaSenha,
            RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.atualizarUsuario(id, nome, email, papel, novaSenha),
                "Usuário atualizado.", "redirect:/configuracoes?mostrarTodosUsuarios=true", redirectAttributes);
    }

    @PostMapping("/usuarios/{id}/excluir")
    public String excluirUsuario(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.excluirUsuario(id), "Usuário excluído.",
                "redirect:/configuracoes?mostrarTodosUsuarios=true", redirectAttributes);
    }

    @PostMapping("/usuarios/{id}/inativar")
    public String inativarUsuario(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.inativarUsuario(id), "Usuário inativado.",
                "redirect:/configuracoes?mostrarTodosUsuarios=true", redirectAttributes);
    }

    @PostMapping("/usuarios/{id}/reativar")
    public String reativarUsuario(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.reativarUsuario(id), "Usuário reativado.",
                "redirect:/configuracoes?mostrarTodosUsuarios=true", redirectAttributes);
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

    @PostMapping("/formas-pagamento/{id}")
    public String atualizarFormaPagamento(@PathVariable Long id, @RequestParam String nome,
            RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.atualizarFormaPagamento(id, nome),
                "Forma de pagamento atualizada.", "redirect:/configuracoes", redirectAttributes);
    }

    @PostMapping("/formas-pagamento/{id}/inativar")
    public String inativarFormaPagamento(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.inativarFormaPagamento(id), "Forma de pagamento inativada.",
                "redirect:/configuracoes?mostrarTodasFormas=true", redirectAttributes);
    }

    @PostMapping("/formas-pagamento/{id}/reativar")
    public String reativarFormaPagamento(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.reativarFormaPagamento(id), "Forma de pagamento reativada.",
                "redirect:/configuracoes?mostrarTodasFormas=true", redirectAttributes);
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

    @PostMapping("/categorias/{id}")
    public String atualizarCategoria(@PathVariable Long id, @RequestParam String nome,
            RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.atualizarCategoria(id, nome),
                "Categoria atualizada.", "redirect:/configuracoes", redirectAttributes);
    }

    @PostMapping("/categorias/{id}/inativar")
    public String inativarCategoria(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.inativarCategoria(id), "Categoria de produto inativada.",
                "redirect:/configuracoes?mostrarTodasCategorias=true", redirectAttributes);
    }

    @PostMapping("/categorias/{id}/reativar")
    public String reativarCategoria(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        return executar(() -> configuracaoService.reativarCategoria(id), "Categoria de produto reativada.",
                "redirect:/configuracoes?mostrarTodasCategorias=true", redirectAttributes);
    }

    private String executar(Runnable acao, String sucesso, String redirect,
            RedirectAttributes redirectAttributes) {
        try {
            acao.run();
            redirectAttributes.addFlashAttribute("sucesso", sucesso);
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return redirect;
    }
}
