package br.esteticadesk.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginWebController {

    @GetMapping("/")
    public String inicio() {
        return "redirect:/dashboard";
    }

    @GetMapping("/login")
    public String login(@RequestParam(required = false) String erro,
            @RequestParam(required = false) String logout, Model model) {
        if (erro != null) {
            model.addAttribute("erro", "Credenciais inválidas.");
        }
        if (logout != null) {
            model.addAttribute("info", "Sessão encerrada com sucesso.");
        }
        return "auth/login";
    }
}
