package br.esteticadesk.web.controller;

import br.esteticadesk.dashboard.service.DashboardService;
import java.time.LocalDate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/dashboard")
public class DashboardWebController {

    private final DashboardService dashboardService;

    public DashboardWebController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public String index(Model model) {
        var hoje = LocalDate.now();
        var dados = dashboardService.carregar(hoje.withDayOfMonth(1), hoje.withDayOfMonth(hoje.lengthOfMonth()));
        model.addAttribute("dados", dados);
        model.addAttribute("menuAtivo", "dashboard");
        return "dashboard/index";
    }
}
