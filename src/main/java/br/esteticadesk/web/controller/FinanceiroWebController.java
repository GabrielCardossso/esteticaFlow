package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.finance.repository.DespesaRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.finance.service.FinanceiroService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/financeiro")
public class FinanceiroWebController {

    private final ReceitaRepository receitas;
    private final DespesaRepository despesas;
    private final FinanceiroService financeiroService;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;

    public FinanceiroWebController(ReceitaRepository receitas, DespesaRepository despesas,
            FinanceiroService financeiroService, SessaoUsuario sessao, AssinaturaService assinaturas) {
        this.receitas = receitas;
        this.despesas = despesas;
        this.financeiroService = financeiroService;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
    }

    @GetMapping
    public String index(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false, defaultValue = "todos") String tipo,
            @RequestParam(required = false) String busca, Model model) {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var empresaId = sessao.empresaObrigatoria();
        var hoje = HorarioSistema.hoje();
        var dataInicio = inicio == null ? hoje.withDayOfMonth(1) : inicio;
        var dataFim = fim == null ? hoje : fim;
        if (dataFim.isBefore(dataInicio)) {
            dataFim = dataInicio;
        }

        var termo = busca == null ? "" : busca.trim().toLowerCase();
        var listaReceitas = receitas.findByEmpresaIdAndDataRecebimentoBetween(empresaId, dataInicio, dataFim)
                .stream()
                .filter(r -> termo.isEmpty() || contem(r.getDescricao(), termo)
                        || (r.getFormaPagamento() != null && contem(r.getFormaPagamento().getNome(), termo)))
                .toList();
        var listaDespesas = despesas.findByEmpresaIdAndDataPagamentoBetween(empresaId, dataInicio, dataFim)
                .stream()
                .filter(d -> termo.isEmpty() || contem(d.getDescricao(), termo)
                        || (d.getCategoria() != null && contem(d.getCategoria().name(), termo)))
                .toList();

        model.addAttribute("indicadores", financeiroService.indicadores());
        model.addAttribute("receitas", "saidas".equals(tipo) ? java.util.List.of() : listaReceitas);
        model.addAttribute("despesas", "entradas".equals(tipo) ? java.util.List.of() : listaDespesas);
        model.addAttribute("fluxoCaixa", financeiroService.calcularFluxoCaixa(dataInicio, dataFim));
        model.addAttribute("inicio", dataInicio);
        model.addAttribute("fim", dataFim);
        model.addAttribute("tipo", tipo);
        model.addAttribute("busca", busca == null ? "" : busca);
        model.addAttribute("menuAtivo", "financeiro");
        return "finance/index";
    }

    private static boolean contem(String valor, String termo) {
        return valor != null && valor.toLowerCase().contains(termo);
    }
}
