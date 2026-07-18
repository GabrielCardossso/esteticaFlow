package br.esteticadesk.web.auth;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class EmpresaAcessoInterceptor implements HandlerInterceptor {

    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;

    public EmpresaAcessoInterceptor(SessaoUsuario sessao, AssinaturaService assinaturas) {
        this.sessao = sessao;
        this.assinaturas = assinaturas;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if (sessao.getUsuarioId() == null || sessao.isSuperAdmin()) {
            return true;
        }
        var empresa = assinaturas.empresaAtual();
        if (assinaturas.empresaPodeAcessar(empresa)) {
            return true;
        }

        sessao.encerrar();
        SecurityContextHolder.clearContext();
        request.getSession().invalidate();
        response.sendRedirect(request.getContextPath() + "/login?empresaIndisponivel");
        return false;
    }
}
