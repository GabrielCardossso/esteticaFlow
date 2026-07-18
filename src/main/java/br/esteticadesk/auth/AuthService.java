package br.esteticadesk.auth;

import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.AssinaturaService;
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
    private final EmpresaRepository empresas;
    private final AssinaturaService assinaturas;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, SessaoUsuario sessao, LogService logs,
            AuthenticationManager authenticationManager, EmpresaRepository empresas, AssinaturaService assinaturas) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.sessao = sessao;
        this.logs = logs;
        this.authenticationManager = authenticationManager;
        this.empresas = empresas;
        this.assinaturas = assinaturas;
    }

    public Usuario autenticar(String email, String senha) {
        var autenticacao = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, senha));
        var usuario = usuarios.findByEmail(autenticacao.getName()).orElseThrow(CredenciaisInvalidasException::new);
        if (!Boolean.TRUE.equals(usuario.getAtivo()))
            throw new UsuarioInativoException();
        var empresa = empresas.findById(usuario.getEmpresaId()).orElseThrow(EmpresaIndisponivelException::new);
        assinaturas.recalcularSituacao(empresa, java.time.LocalDate.now());
        if (!usuario.getPapel().isSuperAdmin() && !assinaturas.empresaPodeAcessar(empresa))
            throw new EmpresaIndisponivelException();
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

    public static class EmpresaIndisponivelException extends RuntimeException {
        public EmpresaIndisponivelException() {
            super("A empresa está inativa, bloqueada ou com a assinatura cancelada.");
        }
    }
}
