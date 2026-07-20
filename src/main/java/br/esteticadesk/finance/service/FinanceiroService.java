package br.esteticadesk.finance.service;

import br.esteticadesk.finance.dto.IndicadoresFinanceirosDTO;
import br.esteticadesk.finance.entity.Despesa;
import java.math.BigDecimal;
import java.time.LocalDate;

public interface FinanceiroService {
    Despesa registrarDespesa(Despesa despesa);

    BigDecimal calcularFluxoCaixa(LocalDate inicio, LocalDate fim);

    IndicadoresFinanceirosDTO indicadores();
}
