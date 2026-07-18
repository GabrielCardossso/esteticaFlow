package br.esteticadesk.web.controller;

import br.esteticadesk.appointment.dto.ServicoDTO;
import br.esteticadesk.appointment.service.ServicoService;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.dao.DataIntegrityViolationException;
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
@RequestMapping("/servicos")
public class ServicoWebController {
    private final ServicoService servicoService;

    public ServicoWebController(ServicoService servicoService) {
        this.servicoService = servicoService;
    }

    @GetMapping
    public String listar(Model model) {
        model.addAttribute("servicos", servicoService.listar());
        model.addAttribute("categorias", servicoService.categoriasAtivas());
        model.addAttribute("menuAtivo", "servicos");
        return "service/list";
    }

    @GetMapping("/novo")
    public String novo(Model model) {
        prepararFormulario(model,
                new ServicoDTO(null, "", "", BigDecimal.ZERO, 60, null, true));
        return "service/form";
    }

    @GetMapping("/{id}/editar")
    public String editar(@PathVariable Long id, Model model) {
        prepararFormulario(model, servicoService.obter(id));
        return "service/form";
    }

    @PostMapping
    public String salvar(@Valid @ModelAttribute("servico") ServicoDTO servico, BindingResult bindingResult,
            RedirectAttributes redirectAttributes, Model model) {
        if (bindingResult.hasErrors()) {
            prepararFormulario(model, servico);
            return "service/form";
        }
        try {
            servicoService.salvar(servico);
            redirectAttributes.addFlashAttribute("sucesso",
                    servico.id() == null ? "Serviço cadastrado com sucesso." : "Serviço atualizado com sucesso.");
            return "redirect:/servicos";
        } catch (IllegalArgumentException | RecursoNaoEncontradoException exception) {
            model.addAttribute("erro", exception.getMessage());
            prepararFormulario(model, servico);
            return "service/form";
        }
    }

    @PostMapping("/{id}/inativar")
    public String inativar(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        servicoService.inativar(id);
        redirectAttributes.addFlashAttribute("sucesso", "Serviço inativado com sucesso.");
        return "redirect:/servicos";
    }

    @PostMapping("/categorias")
    public String criarCategoria(@RequestParam String nome, RedirectAttributes redirectAttributes) {
        try {
            servicoService.criarCategoria(nome);
            redirectAttributes.addFlashAttribute("sucesso", "Categoria de serviço criada com sucesso.");
        } catch (IllegalArgumentException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        } catch (DataIntegrityViolationException exception) {
            redirectAttributes.addFlashAttribute("erro", "Já existe uma categoria de serviço com este nome.");
        }
        return "redirect:/servicos";
    }

    private void prepararFormulario(Model model, ServicoDTO servico) {
        model.addAttribute("servico", servico);
        model.addAttribute("categorias", servicoService.categoriasAtivas());
        model.addAttribute("menuAtivo", "servicos");
    }
}
