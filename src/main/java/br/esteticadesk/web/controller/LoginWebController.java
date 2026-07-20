package br.esteticadesk.web.controller;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginWebController {

    @GetMapping("/")
    public String inicio(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return "redirect:/dashboard";
        }
        return "landing/index";
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

    @GetMapping("/suporte")
    public String suporte() {
        return "support/index";
    }
}
