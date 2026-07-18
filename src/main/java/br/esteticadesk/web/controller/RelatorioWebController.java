package br.esteticadesk.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/relatorios")
public class RelatorioWebController {

    @GetMapping
    public String index(Model model) {
        model.addAttribute("menuAtivo", "relatorios");
        return "report/index";
    }
}
