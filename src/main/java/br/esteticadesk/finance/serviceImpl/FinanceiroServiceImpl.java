package br.esteticadesk.finance.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.repository.*;
import br.esteticadesk.finance.service.FinanceiroService;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FinanceiroServiceImpl implements FinanceiroService {
    private final DespesaRepository despesas;
    private final ReceitaRepository receitas;
    private final SessaoUsuario sessao;

    public FinanceiroServiceImpl(DespesaRepository despesas, ReceitaRepository receitas, SessaoUsuario sessao) {
        this.despesas = despesas;
        this.receitas = receitas;
        this.sessao = sessao;
    }

    public Despesa registrarDespesa(Despesa despesa) {
        if (despesa.getValor() == null || despesa.getValor().signum() <= 0)
            throw new IllegalArgumentException("Valor deve ser maior que zero.");
        despesa.setEmpresaId(sessao.empresaObrigatoria());
        return despesas.save(despesa);
    }

    @Transactional(readOnly = true)
    public BigDecimal calcularFluxoCaixa(LocalDate inicio, LocalDate fim) {
        var empresaId = sessao.empresaObrigatoria();
        var entradas = receitas.findByEmpresaIdAndDataRecebimentoBetween(empresaId, inicio, fim).stream()
                .map(r -> r.getValor()).reduce(BigDecimal.ZERO, BigDecimal::add);
        var saidas = despesas.findByEmpresaIdAndDataPagamentoBetween(empresaId, inicio, fim).stream()
                .map(d -> d.getValor()).reduce(BigDecimal.ZERO, BigDecimal::add);
        return entradas.subtract(saidas);
    }
}
