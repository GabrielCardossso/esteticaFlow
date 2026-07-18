package br.esteticadesk.web.auth;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.employee.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class AutenticacaoSucessoHandler implements AuthenticationSuccessHandler {

    private final SessaoUsuario sessao;
    private final UsuarioRepository usuarios;
    private final LogService logs;

    public AutenticacaoSucessoHandler(SessaoUsuario sessao, UsuarioRepository usuarios, LogService logs) {
        this.sessao = sessao;
        this.usuarios = usuarios;
        this.logs = logs;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        var usuario = usuarios.findByEmail(authentication.getName()).orElseThrow();
        sessao.iniciar(usuario);
        logs.registrar(usuario.getEmpresaId(), usuario, "LOGIN_REALIZADO", null);
        response.sendRedirect(request.getContextPath() + "/dashboard");
    }
}
