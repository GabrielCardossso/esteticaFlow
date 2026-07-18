package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/estoque")
public class EstoqueWebController {

    private final EstoqueRepository estoques;
    private final SessaoUsuario sessao;

    public EstoqueWebController(EstoqueRepository estoques, SessaoUsuario sessao) {
        this.estoques = estoques;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("estoques", estoques.findByEmpresaId(sessao.empresaObrigatoria()));
        model.addAttribute("menuAtivo", "estoque");
        return "inventory/index";
    }
}
