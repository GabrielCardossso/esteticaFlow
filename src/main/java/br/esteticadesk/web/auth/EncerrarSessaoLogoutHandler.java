package br.esteticadesk.web.auth;

import br.esteticadesk.auth.SessaoUsuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

@Component
public class EncerrarSessaoLogoutHandler implements LogoutHandler {

    private final SessaoUsuario sessao;

    public EncerrarSessaoLogoutHandler(SessaoUsuario sessao) {
        this.sessao = sessao;
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        sessao.encerrar();
    }
}
