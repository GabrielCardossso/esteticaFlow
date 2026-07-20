package br.esteticadesk.web.api;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessao")
public class SessaoApiController {

    @GetMapping("/ping")
    public Map<String, Object> ping(HttpSession session) {
        session.setAttribute("lastPing", System.currentTimeMillis());
        return Map.of("ok", true, "serverTime", System.currentTimeMillis());
    }
}
