package br.esteticadesk.web.auth;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.auth.service.HistoricoAcessoService;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.employee.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class AutenticacaoSucessoHandler implements AuthenticationSuccessHandler {

    private final SessaoUsuario sessao;
    private final UsuarioRepository usuarios;
    private final LogService logs;
    private final EmpresaRepository empresas;
    private final AssinaturaService assinaturas;
    private final HistoricoAcessoService historicoAcesso;

    public AutenticacaoSucessoHandler(SessaoUsuario sessao, UsuarioRepository usuarios, LogService logs,
            EmpresaRepository empresas, AssinaturaService assinaturas, HistoricoAcessoService historicoAcesso) {
        this.sessao = sessao;
        this.usuarios = usuarios;
        this.logs = logs;
        this.empresas = empresas;
        this.assinaturas = assinaturas;
        this.historicoAcesso = historicoAcesso;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        var usuario = usuarios.findByEmail(authentication.getName()).orElseThrow();
        sessao.iniciar(usuario);
        var empresa = empresas.findById(usuario.getEmpresaId()).orElseThrow();
        assinaturas.recalcularSituacao(empresa, java.time.LocalDate.now());
        if (!sessao.isSuperAdmin() && !assinaturas.empresaPodeAcessar(empresa)) {
            sessao.encerrar();
            SecurityContextHolder.clearContext();
            request.getSession().invalidate();
            response.sendRedirect(request.getContextPath() + "/login?empresaIndisponivel");
            return;
        }
        logs.registrar(usuario.getEmpresaId(), usuario, "LOGIN_REALIZADO", null);
        historicoAcesso.registrarLogin(usuario.getEmpresaId(), usuario.getId(), request);
        response.sendRedirect(request.getContextPath() + "/dashboard");
    }
}
