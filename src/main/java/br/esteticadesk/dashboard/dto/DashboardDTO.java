package br.esteticadesk.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardDTO(BigDecimal receitaDoMes, BigDecimal despesasDoMes, BigDecimal saldoDoMes,
        BigDecimal ticketMedio, Integer agendamentosHoje, Integer servicosConcluidosNoMes,
        List<FaturamentoMensalDTO> graficoFaturamento, List<ServicoMaisVendidoDTO> graficoServicosMaisVendidos,
        List<DespesaPorCategoriaDTO> graficoDespesasPorCategoria, List<AlertaEstoqueDTO> alertasEstoque,
        List<AgendamentoResumoDTO> agendamentosDoDia) {
}
