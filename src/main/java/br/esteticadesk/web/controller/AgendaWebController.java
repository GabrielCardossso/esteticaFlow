package br.esteticadesk.web.controller;

import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/agenda")
public class AgendaWebController {

    private final AgendamentoRepository agendamentos;
    private final SessaoUsuario sessao;

    public AgendaWebController(AgendamentoRepository agendamentos, SessaoUsuario sessao) {
        this.agendamentos = agendamentos;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(@RequestParam(required = false) LocalDate data, Model model) {
        var dia = data == null ? LocalDate.now() : data;
        var inicio = dia.atStartOfDay();
        var fim = dia.atTime(LocalTime.MAX);
        var lista = agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                sessao.empresaObrigatoria(), inicio, fim);
        model.addAttribute("agendamentos", lista);
        model.addAttribute("data", dia);
        model.addAttribute("dataAnterior", dia.minusDays(1));
        model.addAttribute("dataProxima", dia.plusDays(1));
        model.addAttribute("menuAtivo", "agenda");
        return "appointment/index";
    }
}
