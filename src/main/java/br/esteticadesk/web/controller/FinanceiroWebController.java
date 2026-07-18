package br.esteticadesk.web.controller;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.finance.repository.DespesaRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.finance.service.FinanceiroService;
import java.time.LocalDate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/financeiro")
public class FinanceiroWebController {

    private final ReceitaRepository receitas;
    private final DespesaRepository despesas;
    private final FinanceiroService financeiroService;
    private final SessaoUsuario sessao;

    public FinanceiroWebController(ReceitaRepository receitas, DespesaRepository despesas,
            FinanceiroService financeiroService, SessaoUsuario sessao) {
        this.receitas = receitas;
        this.despesas = despesas;
        this.financeiroService = financeiroService;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(Model model) {
        var empresaId = sessao.empresaObrigatoria();
        var inicio = LocalDate.now().withDayOfMonth(1);
        var fim = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        model.addAttribute("receitas", receitas.findByEmpresaIdOrderByDataRecebimentoDesc(empresaId));
        model.addAttribute("despesas", despesas.findByEmpresaIdOrderByDataPagamentoDesc(empresaId));
        model.addAttribute("fluxoCaixa", financeiroService.calcularFluxoCaixa(inicio, fim));
        model.addAttribute("menuAtivo", "financeiro");
        return "finance/index";
    }
}
