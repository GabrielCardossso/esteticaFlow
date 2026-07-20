package br.esteticadesk.finance.dto;

import java.math.BigDecimal;

public record IndicadoresFinanceirosDTO(
        BigDecimal receitaDia,
        BigDecimal receitaSemana,
        BigDecimal receitaMes,
        BigDecimal receitaAno,
        BigDecimal totalRecebido,
        BigDecimal totalPendente,
        BigDecimal totalDespesas,
        BigDecimal lucroEstimado) {
}
