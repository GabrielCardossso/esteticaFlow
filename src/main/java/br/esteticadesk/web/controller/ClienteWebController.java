package br.esteticadesk.web.controller;

import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.service.ClienteService;
import br.esteticadesk.exception.CpfJaCadastradoException;
import jakarta.validation.Valid;
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
@RequestMapping("/clientes")
public class ClienteWebController {

    private final ClienteService clienteService;

    public ClienteWebController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public String listar(@RequestParam(required = false) String busca,
            @RequestParam(required = false, defaultValue = "true") boolean ativos, Model model) {
        model.addAttribute("clientes", clienteService.listar(busca, ativos));
        model.addAttribute("busca", busca == null ? "" : busca);
        model.addAttribute("ativos", ativos);
        model.addAttribute("menuAtivo", "clientes");
        return "customer/list";
    }

    @GetMapping("/novo")
    public String novo(Model model) {
        model.addAttribute("cliente", new ClienteDTO(null, "", "", "", "", true));
        model.addAttribute("menuAtivo", "clientes");
        return "customer/form";
    }

    @PostMapping
    public String salvar(@Valid @ModelAttribute("cliente") ClienteDTO cliente, BindingResult bindingResult,
            RedirectAttributes redirectAttributes, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("menuAtivo", "clientes");
            return "customer/form";
        }
        try {
            clienteService.salvar(cliente);
            redirectAttributes.addFlashAttribute("sucesso", "Cliente cadastrado com sucesso.");
            return "redirect:/clientes";
        } catch (CpfJaCadastradoException | IllegalArgumentException exception) {
            model.addAttribute("erro", exception.getMessage());
            model.addAttribute("menuAtivo", "clientes");
            return "customer/form";
        }
    }

    @PostMapping("/{id}/inativar")
    public String inativar(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        clienteService.inativar(id);
        redirectAttributes.addFlashAttribute("sucesso", "Cliente inativado com sucesso.");
        return "redirect:/clientes";
    }
}
