package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.repository.LogSistemaRepository;
import br.esteticadesk.settings.service.ConfiguracaoService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/historico")
public class LogWebController {

    private final SessaoUsuario sessao;
    private final LogSistemaRepository logs;
    private final ConfiguracaoService configuracoes;

    public LogWebController(SessaoUsuario sessao, LogSistemaRepository logs, ConfiguracaoService configuracoes) {
        this.sessao = sessao;
        this.logs = logs;
        this.configuracoes = configuracoes;
    }

    @GetMapping
    public String index(@RequestParam(required = false) Long empresaId, Model model) {
        if (!sessao.isSuperAdmin()) {
            throw new SecurityException("Apenas o administrador do sistema pode consultar o histórico.");
        }
        var registros = empresaId != null
                ? logs.findTop200ByEmpresaIdOrderByDataHoraDesc(empresaId)
                : logs.findTop200ByOrderByDataHoraDesc();
        model.addAttribute("logs", registros);
        model.addAttribute("empresas", configuracoes.listarEmpresas(true));
        model.addAttribute("empresaIdFiltro", empresaId);
        model.addAttribute("menuAtivo", "historico");
        return "company/logs";
    }
}
