package br.esteticadesk.auth.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.auth.entity.HistoricoAcesso;
import br.esteticadesk.auth.repository.HistoricoAcessoRepository;
import br.esteticadesk.common.HorarioSistema;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class HistoricoAcessoService {

    private final HistoricoAcessoRepository historicos;
    private final SessaoUsuario sessao;

    public HistoricoAcessoService(HistoricoAcessoRepository historicos, SessaoUsuario sessao) {
        this.historicos = historicos;
        this.sessao = sessao;
    }

    public void registrarLogin(Long empresaId, Long usuarioId, HttpServletRequest request) {
        var registro = new HistoricoAcesso();
        registro.setEmpresaId(empresaId);
        registro.setUsuarioId(usuarioId);
        registro.setDataHora(HorarioSistema.agora());
        registro.setIp(resolverIp(request));
        var ua = request.getHeader("User-Agent");
        registro.setUserAgent(ua == null ? null : ua.substring(0, Math.min(ua.length(), 500)));
        registro.setNavegador(detectarNavegador(ua));
        registro.setSistemaOperacional(detectarSo(ua));
        historicos.save(registro);
    }

    @Transactional(readOnly = true)
    public Optional<HistoricoAcesso> ultimoAcessoDoUsuarioAtual() {
        if (sessao.getUsuarioId() == null) {
            return Optional.empty();
        }
        return historicos.findFirstByUsuarioIdOrderByDataHoraDesc(sessao.getUsuarioId());
    }

    @Transactional(readOnly = true)
    public List<HistoricoAcesso> recentesDaEmpresa() {
        return historicos.findTop10ByEmpresaIdOrderByDataHoraDesc(sessao.empresaObrigatoria());
    }

    private String resolverIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String detectarNavegador(String ua) {
        if (ua == null) {
            return "Desconhecido";
        }
        if (ua.contains("Edg/")) {
            return "Microsoft Edge";
        }
        if (ua.contains("Chrome/")) {
            return "Google Chrome";
        }
        if (ua.contains("Firefox/")) {
            return "Mozilla Firefox";
        }
        if (ua.contains("Safari/") && !ua.contains("Chrome/")) {
            return "Safari";
        }
        return "Outro";
    }

    private String detectarSo(String ua) {
        if (ua == null) {
            return "Desconhecido";
        }
        if (ua.contains("Windows")) {
            return "Windows";
        }
        if (ua.contains("Mac OS X") || ua.contains("Macintosh")) {
            return "macOS";
        }
        if (ua.contains("Android")) {
            return "Android";
        }
        if (ua.contains("iPhone") || ua.contains("iPad")) {
            return "iOS";
        }
        if (ua.contains("Linux")) {
            return "Linux";
        }
        return "Outro";
    }
}
