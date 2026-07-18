package br.esteticadesk.auth;

import br.esteticadesk.common.service.LogService;
import br.esteticadesk.employee.entity.Usuario;
import br.esteticadesk.employee.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final SessaoUsuario sessao;
    private final LogService logs;
    private final AuthenticationManager authenticationManager;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, SessaoUsuario sessao, LogService logs, AuthenticationManager authenticationManager) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.sessao = sessao;
        this.logs = logs;
        this.authenticationManager = authenticationManager;
    }

    public Usuario autenticar(String email, String senha) {
        var autenticacao = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, senha));
        var usuario = usuarios.findByEmail(autenticacao.getName()).orElseThrow(CredenciaisInvalidasException::new);
        if (!Boolean.TRUE.equals(usuario.getAtivo()))
            throw new UsuarioInativoException();
        SecurityContextHolder.getContext().setAuthentication(autenticacao);
        sessao.iniciar(usuario);
        logs.registrar(usuario.getEmpresaId(), usuario, "LOGIN_REALIZADO", null);
        return usuario;
    }

    public static class CredenciaisInvalidasException extends RuntimeException {
        public CredenciaisInvalidasException() {
            super("Credenciais inválidas.");
        }
    }

    public static class UsuarioInativoException extends RuntimeException {
        public UsuarioInativoException() {
            super("Usuário inativo.");
        }
    }
}
