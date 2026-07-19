package br.esteticadesk.web.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.TestingAuthenticationToken;

class LoginWebControllerTest {

    private final LoginWebController controller = new LoginWebController();

    @Test
    void exibeLandingParaVisitanteAnonimo() {
        var anonymous = new AnonymousAuthenticationToken("key", "anonymous",
                List.of(() -> "ROLE_ANONYMOUS"));

        assertEquals("landing/index", controller.inicio(anonymous));
    }

    @Test
    void redirecionaUsuarioAutenticadoAoDashboard() {
        var authentication = new TestingAuthenticationToken("usuario", "senha", "ROLE_USER");

        assertEquals("redirect:/dashboard", controller.inicio(authentication));
    }
}
