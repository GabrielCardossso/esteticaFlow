package br.esteticadesk.web.controller;

import br.esteticadesk.dashboard.service.DashboardService;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.repository.EmpresaRepository;
import java.time.LocalDate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/dashboard")
public class DashboardWebController {

    private final DashboardService dashboardService;
    private final SessaoUsuario sessao;
    private final EmpresaRepository empresas;

    public DashboardWebController(DashboardService dashboardService, SessaoUsuario sessao,
            EmpresaRepository empresas) {
        this.dashboardService = dashboardService;
        this.sessao = sessao;
        this.empresas = empresas;
    }

    @GetMapping
    public String index(Model model) {
        var hoje = LocalDate.now();
        var dados = dashboardService.carregar(hoje.withDayOfMonth(1), hoje.withDayOfMonth(hoje.lengthOfMonth()));
        model.addAttribute("dados", dados);
        var usuario = sessao.getUsuarioLogado();
        var nomeSaudacao = usuario != null && usuario.getNome() != null && !usuario.getNome().isBlank()
                ? usuario.getNome()
                : empresas.findById(sessao.empresaObrigatoria()).map(empresa -> empresa.getNomeFantasia())
                        .orElse("EsteticaFlow");
        model.addAttribute("nomeSaudacao", nomeSaudacao);
        model.addAttribute("menuAtivo", "dashboard");
        return "dashboard/index";
    }
}
