package br.esteticadesk.report.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class FiltroPeriodoRelatorioTest {

    @Test
    void resolveDiaNaPropriaData() {
        var periodo = FiltroPeriodoRelatorio.DIA.resolver(LocalDate.of(2024, 2, 29));

        assertEquals(LocalDate.of(2024, 2, 29), periodo.inicio());
        assertEquals(LocalDate.of(2024, 2, 29), periodo.fim());
    }

    @Test
    void resolveSemanaDeSegundaADomingoNasBordas() {
        var segunda = FiltroPeriodoRelatorio.SEMANA.resolver(LocalDate.of(2026, 7, 13));
        var domingo = FiltroPeriodoRelatorio.SEMANA.resolver(LocalDate.of(2026, 7, 19));

        assertEquals(LocalDate.of(2026, 7, 13), segunda.inicio());
        assertEquals(LocalDate.of(2026, 7, 19), segunda.fim());
        assertEquals(segunda, domingo);
    }

    @Test
    void resolveMesRespeitandoAnoBissexto() {
        var periodo = FiltroPeriodoRelatorio.MES.resolver(LocalDate.of(2024, 2, 10));

        assertEquals(LocalDate.of(2024, 2, 1), periodo.inicio());
        assertEquals(LocalDate.of(2024, 2, 29), periodo.fim());
    }

    @Test
    void resolveSeisMesesCalendarioAtravessandoAno() {
        var periodo = FiltroPeriodoRelatorio.ULTIMOS_6_MESES.resolver(LocalDate.of(2026, 2, 28));

        assertEquals(LocalDate.of(2025, 9, 1), periodo.inicio());
        assertEquals(LocalDate.of(2026, 2, 28), periodo.fim());
    }

    @Test
    void usaHojeQuandoReferenciaNaoInformada() {
        var antes = LocalDate.now();
        var periodo = FiltroPeriodoRelatorio.DIA.resolver(null);
        var depois = LocalDate.now();

        assertFalse(periodo.inicio().isBefore(antes));
        assertFalse(periodo.inicio().isAfter(depois));
        assertEquals(periodo.inicio(), periodo.fim());
    }

    @Test
    void rejeitaIntervaloInvertido() {
        assertThrows(IllegalArgumentException.class,
                () -> new PeriodoRelatorio(LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 1)));
    }
}
