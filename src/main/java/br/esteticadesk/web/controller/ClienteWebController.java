package br.esteticadesk.web.controller;

import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.service.ClienteService;
import br.esteticadesk.exception.CpfJaCadastradoException;
import br.esteticadesk.exception.PlacaJaCadastradaException;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.service.VeiculoService;
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
    private final VeiculoService veiculoService;

    public ClienteWebController(ClienteService clienteService, VeiculoService veiculoService) {
        this.clienteService = clienteService;
        this.veiculoService = veiculoService;
    }

    @GetMapping
    public String listar(@RequestParam(required = false) String busca,
            @RequestParam(required = false, defaultValue = "true") boolean ativos,
            @RequestParam(required = false, defaultValue = "nome") String ordenacao,
            Model model) {
        model.addAttribute("clientes", clienteService.listar(busca, ativos, ordenacao));
        model.addAttribute("busca", busca == null ? "" : busca);
        model.addAttribute("ativos", ativos);
        model.addAttribute("ordenacao", ordenacao);
        model.addAttribute("menuAtivo", "clientes");
        return "customer/list";
    }

    @GetMapping("/novo")
    public String novo(Model model) {
        model.addAttribute("cliente", clienteVazio());
        model.addAttribute("menuAtivo", "clientes");
        return "customer/form";
    }

    @GetMapping("/{id}")
    public String detalhe(@PathVariable Long id, Model model) {
        model.addAttribute("detalhe", clienteService.buscarDetalhe(id));
        model.addAttribute("menuAtivo", "clientes");
        return "customer/detail";
    }

    @GetMapping("/{id}/editar")
    public String editar(@PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean mostrarTodosVeiculos, Model model) {
        model.addAttribute("cliente", clienteService.buscarPorId(id));
        prepararFicha(model, id, new Veiculo(), false, mostrarTodosVeiculos);
        return "customer/form";
    }

    @GetMapping("/{clienteId}/veiculos/{veiculoId}/editar")
    public String editarVeiculo(@PathVariable Long clienteId, @PathVariable Long veiculoId, Model model) {
        model.addAttribute("cliente", clienteService.buscarPorId(clienteId));
        prepararFicha(model, clienteId, veiculoService.buscarPorId(veiculoId, clienteId), true, false);
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
            var salvo = clienteService.salvar(cliente);
            redirectAttributes.addFlashAttribute("sucesso", "Cliente cadastrado com sucesso.");
            return "redirect:/clientes/" + salvo.id();
        } catch (CpfJaCadastradoException | IllegalArgumentException exception) {
            model.addAttribute("erro", exception.getMessage());
            model.addAttribute("menuAtivo", "clientes");
            return "customer/form";
        }
    }

    @PostMapping("/{id}")
    public String atualizar(@PathVariable Long id, @Valid @ModelAttribute("cliente") ClienteDTO cliente,
            BindingResult bindingResult, RedirectAttributes redirectAttributes, Model model) {
        if (bindingResult.hasErrors()) {
            prepararFicha(model, id, new Veiculo(), false, false);
            return "customer/form";
        }
        try {
            clienteService.atualizar(id, cliente);
            redirectAttributes.addFlashAttribute("sucesso", "Cliente atualizado com sucesso.");
            return "redirect:/clientes/" + id;
        } catch (CpfJaCadastradoException | IllegalArgumentException exception) {
            model.addAttribute("erro", exception.getMessage());
            prepararFicha(model, id, new Veiculo(), false, false);
            return "customer/form";
        }
    }

    @PostMapping("/{clienteId}/veiculos")
    public String salvarVeiculo(@PathVariable Long clienteId,
            @Valid @ModelAttribute("veiculo") Veiculo veiculo, BindingResult bindingResult,
            RedirectAttributes redirectAttributes, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("cliente", clienteService.buscarPorId(clienteId));
            prepararFicha(model, clienteId, veiculo, veiculo.getId() != null, false);
            return "customer/form";
        }
        try {
            var atualizacao = veiculo.getId() != null;
            veiculoService.salvar(veiculo, clienteId);
            redirectAttributes.addFlashAttribute("sucesso",
                    atualizacao ? "Veículo atualizado com sucesso." : "Veículo adicionado com sucesso.");
            return "redirect:/clientes/" + clienteId + "/editar";
        } catch (PlacaJaCadastradaException | IllegalArgumentException exception) {
            model.addAttribute("cliente", clienteService.buscarPorId(clienteId));
            model.addAttribute("erro", exception.getMessage());
            prepararFicha(model, clienteId, veiculo, veiculo.getId() != null, false);
            return "customer/form";
        }
    }

    @PostMapping("/{clienteId}/veiculos/{veiculoId}/inativar")
    public String inativarVeiculo(@PathVariable Long clienteId, @PathVariable Long veiculoId,
            RedirectAttributes redirectAttributes) {
        veiculoService.inativar(veiculoId, clienteId);
        redirectAttributes.addFlashAttribute("sucesso", "Veículo inativado com sucesso.");
        return "redirect:/clientes/" + clienteId + "/editar?mostrarTodosVeiculos=true";
    }

    @PostMapping("/{clienteId}/veiculos/{veiculoId}/reativar")
    public String reativarVeiculo(@PathVariable Long clienteId, @PathVariable Long veiculoId,
            RedirectAttributes redirectAttributes) {
        veiculoService.reativar(veiculoId, clienteId);
        redirectAttributes.addFlashAttribute("sucesso", "Veículo reativado com sucesso.");
        return "redirect:/clientes/" + clienteId + "/editar?mostrarTodosVeiculos=true";
    }

    @PostMapping("/{id}/inativar")
    public String inativar(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        clienteService.inativar(id);
        redirectAttributes.addFlashAttribute("sucesso", "Cliente inativado com sucesso.");
        return "redirect:/clientes";
    }

    @PostMapping("/{id}/reativar")
    public String reativar(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        clienteService.reativar(id);
        redirectAttributes.addFlashAttribute("sucesso", "Cliente reativado com sucesso.");
        return "redirect:/clientes";
    }

    private void prepararFicha(Model model, Long clienteId, Veiculo veiculo, boolean editandoVeiculo,
            boolean mostrarTodosVeiculos) {
        if (!model.containsAttribute("cliente"))
            model.addAttribute("cliente", clienteService.buscarPorId(clienteId));
        if (!model.containsAttribute("veiculo"))
            model.addAttribute("veiculo", veiculo);
        model.addAttribute("veiculos", veiculoService.listarPorCliente(clienteId, mostrarTodosVeiculos));
        model.addAttribute("mostrarTodosVeiculos", mostrarTodosVeiculos);
        model.addAttribute("editandoVeiculo", editandoVeiculo);
        model.addAttribute("menuAtivo", "clientes");
    }

    private ClienteDTO clienteVazio() {
        return new ClienteDTO(null, "", "", "", "", "", "", "", "", "", "", "", true);
    }
}
