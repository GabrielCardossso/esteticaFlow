package br.esteticadesk.web.controller;

import br.esteticadesk.enums.UnidadeMedida;
import br.esteticadesk.exception.EstoqueInsuficienteException;
import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.service.EstoqueService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/estoque")
public class EstoqueWebController {

    private final EstoqueService estoqueService;

    public EstoqueWebController(EstoqueService estoqueService) {
        this.estoqueService = estoqueService;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("estoques", estoqueService.listarEstoques());
        model.addAttribute("movimentacoes", estoqueService.listarMovimentacoesRecentes());
        model.addAttribute("menuAtivo", "estoque");
        return "inventory/index";
    }

    @GetMapping("/produtos/novo")
    public String novoProduto(Model model) {
        model.addAttribute("produto", new ProdutoEstoqueDTO(null, "", UnidadeMedida.UN, BigDecimal.ZERO, null,
                BigDecimal.ZERO, BigDecimal.ZERO));
        prepararFormulario(model);
        return "inventory/form";
    }

    @GetMapping("/produtos/{id}/editar")
    public String editarProduto(@PathVariable Long id, Model model) {
        model.addAttribute("produto", estoqueService.obterProduto(id));
        prepararFormulario(model);
        return "inventory/form";
    }

    @PostMapping("/produtos")
    public String salvarProduto(@Valid @ModelAttribute("produto") ProdutoEstoqueDTO produto,
            BindingResult bindingResult, Model model, RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            prepararFormulario(model);
            return "inventory/form";
        }
        try {
            estoqueService.salvarProduto(produto);
            redirectAttributes.addFlashAttribute("sucesso",
                    produto.id() == null ? "Produto cadastrado com sucesso." : "Produto atualizado com sucesso.");
            return "redirect:/estoque";
        } catch (IllegalArgumentException exception) {
            model.addAttribute("erro", exception.getMessage());
            prepararFormulario(model);
            return "inventory/form";
        }
    }

    @PostMapping("/produtos/{id}/inativar")
    public String inativarProduto(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        estoqueService.inativarProduto(id);
        redirectAttributes.addFlashAttribute("sucesso", "Produto inativado com sucesso.");
        return "redirect:/estoque";
    }

    @PostMapping("/produtos/{id}/entrada")
    public String registrarEntrada(@PathVariable Long id, @RequestParam BigDecimal quantidade,
            RedirectAttributes redirectAttributes) {
        return executarMovimentacao(() -> estoqueService.registrarEntrada(id, quantidade),
                "Entrada registrada com sucesso.", redirectAttributes);
    }

    @PostMapping("/produtos/{id}/saida")
    public String registrarSaida(@PathVariable Long id, @RequestParam BigDecimal quantidade,
            RedirectAttributes redirectAttributes) {
        return executarMovimentacao(() -> estoqueService.registrarSaida(id, quantidade),
                "Saída registrada com sucesso.", redirectAttributes);
    }

    @PostMapping("/produtos/{id}/minimo")
    public String alterarMinimo(@PathVariable Long id, @RequestParam BigDecimal quantidadeMinima,
            RedirectAttributes redirectAttributes) {
        try {
            estoqueService.alterarQuantidadeMinima(id, quantidadeMinima);
            redirectAttributes.addFlashAttribute("sucesso", "Quantidade mínima atualizada com sucesso.");
        } catch (IllegalArgumentException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/estoque";
    }

    private String executarMovimentacao(Runnable acao, String mensagemSucesso,
            RedirectAttributes redirectAttributes) {
        try {
            acao.run();
            redirectAttributes.addFlashAttribute("sucesso", mensagemSucesso);
        } catch (IllegalArgumentException | EstoqueInsuficienteException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/estoque";
    }

    private void prepararFormulario(Model model) {
        model.addAttribute("categorias", estoqueService.listarCategoriasAtivas());
        model.addAttribute("unidades", UnidadeMedida.values());
        model.addAttribute("menuAtivo", "estoque");
    }
}
