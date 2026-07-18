package br.esteticadesk.report.dto;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public enum FiltroPeriodoRelatorio {
    DIA("Dia"),
    SEMANA("Semana"),
    MES("Mês"),
    ULTIMOS_6_MESES("Últimos 6 meses");

    private final String descricao;

    FiltroPeriodoRelatorio(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }

    public PeriodoRelatorio resolver(LocalDate referencia) {
        var data = referencia == null ? LocalDate.now() : referencia;
        return switch (this) {
            case DIA -> new PeriodoRelatorio(data, data);
            case SEMANA -> new PeriodoRelatorio(
                    data.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    data.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)));
            case MES -> new PeriodoRelatorio(data.withDayOfMonth(1), data.withDayOfMonth(data.lengthOfMonth()));
            case ULTIMOS_6_MESES -> new PeriodoRelatorio(
                    data.withDayOfMonth(1).minusMonths(5),
                    data.withDayOfMonth(data.lengthOfMonth()));
        };
    }
}
