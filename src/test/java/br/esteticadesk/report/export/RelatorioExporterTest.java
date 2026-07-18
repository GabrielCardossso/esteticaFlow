package br.esteticadesk.report.export;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.report.dto.FiltroPeriodoRelatorio;
import br.esteticadesk.report.dto.PeriodoRelatorio;
import br.esteticadesk.report.dto.RelatorioDTO;
import br.esteticadesk.report.dto.RelatorioDTO.AgendamentoDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.CategoriaDespesaDTO;
import br.esteticadesk.report.dto.RelatorioDTO.DespesaDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.ReceitaDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.ServicoRankingDTO;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class RelatorioExporterTest {

    private final RelatorioDTO relatorio = criarRelatorio();

    @Test
    void geraPdfValidoEmMemoria() throws Exception {
        var bytes = new RelatorioPdfExporter().exportar(relatorio);

        assertTrue(bytes.length > 100);
        assertArrayEquals("%PDF".getBytes(StandardCharsets.US_ASCII), java.util.Arrays.copyOf(bytes, 4));
    }

    @Test
    void geraWorkbookLegivelComAbasDoPlanoExclusive() throws Exception {
        var bytes = new RelatorioExcelExporter().exportar(relatorio);

        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(6, workbook.getNumberOfSheets());
            assertNotNull(workbook.getSheet("Resumo"));
            assertNotNull(workbook.getSheet("Serviços"));
            assertNotNull(workbook.getSheet("Categorias"));
            assertNotNull(workbook.getSheet("Receitas"));
            assertNotNull(workbook.getSheet("Despesas"));
            assertNotNull(workbook.getSheet("Agendamentos"));
            assertEquals(100.0, workbook.getSheet("Resumo").getRow(4).getCell(0).getNumericCellValue());
            assertEquals("'=HIPERLINK(\"https://example.invalid\")",
                    workbook.getSheet("Serviços").getRow(1).getCell(0).getStringCellValue());
        }
    }

    private RelatorioDTO criarRelatorio() {
        var inicio = LocalDate.of(2026, 7, 1);
        var fim = LocalDate.of(2026, 7, 31);
        return new RelatorioDTO(
                "Empresa",
                PlanoAssinatura.EXCLUSIVE,
                FiltroPeriodoRelatorio.MES,
                new PeriodoRelatorio(inicio, fim),
                new BigDecimal("100.00"),
                new BigDecimal("30.00"),
                new BigDecimal("70.00"),
                new BigDecimal("100.00"),
                1,
                List.of(new ServicoRankingDTO("=HIPERLINK(\"https://example.invalid\")", 1,
                        new BigDecimal("100.00"))),
                List.of(new CategoriaDespesaDTO("FIXA", new BigDecimal("30.00"))),
                List.of(new ReceitaDetalheDTO(inicio, "Receita", "PIX", new BigDecimal("100.00"))),
                List.of(new DespesaDetalheDTO(inicio, "Despesa", "FIXA", new BigDecimal("30.00"))),
                List.of(new AgendamentoDetalheDTO(
                        inicio.atTime(10, 0), "Cliente", "ABC1D23 - Modelo", "Lavagem",
                        "CONCLUIDO", new BigDecimal("100.00"))));
    }
}
