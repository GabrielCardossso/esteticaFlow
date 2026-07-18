package br.esteticadesk.report.dto;

import br.esteticadesk.enums.PlanoAssinatura;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record RelatorioDTO(
        String empresa,
        PlanoAssinatura plano,
        FiltroPeriodoRelatorio filtro,
        PeriodoRelatorio periodo,
        BigDecimal receita,
        BigDecimal despesa,
        BigDecimal saldo,
        BigDecimal ticketMedio,
        long agendamentosConcluidos,
        List<ServicoRankingDTO> servicos,
        List<CategoriaDespesaDTO> categorias,
        List<ReceitaDetalheDTO> receitas,
        List<DespesaDetalheDTO> despesas,
        List<AgendamentoDetalheDTO> agendamentos) {

    public RelatorioDTO {
        servicos = List.copyOf(servicos);
        categorias = List.copyOf(categorias);
        receitas = List.copyOf(receitas);
        despesas = List.copyOf(despesas);
        agendamentos = List.copyOf(agendamentos);
    }

    public boolean possuiRankings() {
        return plano == PlanoAssinatura.PRO || plano == PlanoAssinatura.EXCLUSIVE;
    }

    public boolean possuiDetalhes() {
        return plano == PlanoAssinatura.EXCLUSIVE;
    }

    public record ServicoRankingDTO(String nome, long quantidade, BigDecimal valor) {
    }

    public record CategoriaDespesaDTO(String categoria, BigDecimal valor) {
    }

    public record ReceitaDetalheDTO(LocalDate data, String descricao, String formaPagamento, BigDecimal valor) {
    }

    public record DespesaDetalheDTO(LocalDate data, String descricao, String categoria, BigDecimal valor) {
    }

    public record AgendamentoDetalheDTO(
            LocalDateTime dataHora,
            String cliente,
            String veiculo,
            String servicos,
            String status,
            BigDecimal total) {
    }
}
