package br.esteticadesk.report.export;

import br.esteticadesk.report.dto.RelatorioDTO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class RelatorioExcelExporter {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] exportar(RelatorioDTO relatorio) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var cabecalho = criarEstiloCabecalho(workbook);
            var moeda = criarEstiloMoeda(workbook);
            criarResumo(workbook, relatorio, cabecalho, moeda);
            criarServicos(workbook, relatorio, cabecalho, moeda);
            criarCategorias(workbook, relatorio, cabecalho, moeda);
            if (relatorio.possuiDetalhes()) {
                criarReceitas(workbook, relatorio, cabecalho, moeda);
                criarDespesas(workbook, relatorio, cabecalho, moeda);
                criarAgendamentos(workbook, relatorio, cabecalho, moeda);
            }
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private void criarResumo(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Resumo");
        adicionarLinha(sheet, 0, cabecalho, "Empresa", "Plano", "Período inicial", "Período final");
        adicionarLinha(sheet, 1, null, relatorio.empresa(), relatorio.plano().name(),
                DATA.format(relatorio.periodo().inicio()), DATA.format(relatorio.periodo().fim()));
        adicionarLinha(sheet, 3, cabecalho, "Receita", "Despesa", "Saldo", "Ticket médio", "Concluídos");
        var valores = sheet.createRow(4);
        adicionarNumero(valores, 0, relatorio.receita().doubleValue(), moeda);
        adicionarNumero(valores, 1, relatorio.despesa().doubleValue(), moeda);
        adicionarNumero(valores, 2, relatorio.saldo().doubleValue(), moeda);
        adicionarNumero(valores, 3, relatorio.ticketMedio().doubleValue(), moeda);
        valores.createCell(4).setCellValue(relatorio.agendamentosConcluidos());
        ajustarColunas(sheet, 5);
    }

    private void criarServicos(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Serviços");
        adicionarLinha(sheet, 0, cabecalho, "Serviço", "Quantidade", "Valor");
        var linha = 1;
        for (var item : relatorio.servicos()) {
            var row = sheet.createRow(linha++);
            adicionarTexto(row, 0, item.nome());
            row.createCell(1).setCellValue(item.quantidade());
            adicionarNumero(row, 2, item.valor().doubleValue(), moeda);
        }
        ajustarColunas(sheet, 3);
    }

    private void criarCategorias(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Categorias");
        adicionarLinha(sheet, 0, cabecalho, "Categoria", "Valor");
        var linha = 1;
        for (var item : relatorio.categorias()) {
            var row = sheet.createRow(linha++);
            adicionarTexto(row, 0, item.categoria());
            adicionarNumero(row, 1, item.valor().doubleValue(), moeda);
        }
        ajustarColunas(sheet, 2);
    }

    private void criarReceitas(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Receitas");
        adicionarLinha(sheet, 0, cabecalho, "Data", "Descrição", "Forma de pagamento", "Valor");
        var linha = 1;
        for (var item : relatorio.receitas()) {
            var row = sheet.createRow(linha++);
            adicionarTexto(row, 0, DATA.format(item.data()));
            adicionarTexto(row, 1, item.descricao());
            adicionarTexto(row, 2, item.formaPagamento());
            adicionarNumero(row, 3, item.valor().doubleValue(), moeda);
        }
        ajustarColunas(sheet, 4);
    }

    private void criarDespesas(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Despesas");
        adicionarLinha(sheet, 0, cabecalho, "Data", "Descrição", "Categoria", "Valor");
        var linha = 1;
        for (var item : relatorio.despesas()) {
            var row = sheet.createRow(linha++);
            adicionarTexto(row, 0, DATA.format(item.data()));
            adicionarTexto(row, 1, item.descricao());
            adicionarTexto(row, 2, item.categoria());
            adicionarNumero(row, 3, item.valor().doubleValue(), moeda);
        }
        ajustarColunas(sheet, 4);
    }

    private void criarAgendamentos(Workbook workbook, RelatorioDTO relatorio, CellStyle cabecalho, CellStyle moeda) {
        var sheet = workbook.createSheet("Agendamentos");
        adicionarLinha(sheet, 0, cabecalho, "Data", "Cliente", "Veículo", "Serviços", "Status", "Total");
        var linha = 1;
        for (var item : relatorio.agendamentos()) {
            var row = sheet.createRow(linha++);
            adicionarTexto(row, 0, DATA_HORA.format(item.dataHora()));
            adicionarTexto(row, 1, item.cliente());
            adicionarTexto(row, 2, item.veiculo());
            adicionarTexto(row, 3, item.servicos());
            adicionarTexto(row, 4, item.status());
            adicionarNumero(row, 5, item.total().doubleValue(), moeda);
        }
        ajustarColunas(sheet, 6);
    }

    private CellStyle criarEstiloCabecalho(Workbook workbook) {
        var fonte = workbook.createFont();
        fonte.setBold(true);
        var estilo = workbook.createCellStyle();
        estilo.setFont(fonte);
        return estilo;
    }

    private CellStyle criarEstiloMoeda(Workbook workbook) {
        var estilo = workbook.createCellStyle();
        estilo.setDataFormat(workbook.createDataFormat().getFormat("R$ #,##0.00"));
        return estilo;
    }

    private void adicionarLinha(Sheet sheet, int indice, CellStyle estilo, String... valores) {
        var row = sheet.createRow(indice);
        for (var coluna = 0; coluna < valores.length; coluna++) {
            var cell = row.createCell(coluna);
            cell.setCellValue(textoSeguro(valores[coluna]));
            if (estilo != null) {
                cell.setCellStyle(estilo);
            }
        }
    }

    private void adicionarTexto(Row row, int coluna, String valor) {
        row.createCell(coluna).setCellValue(textoSeguro(valor));
    }

    private String textoSeguro(String valor) {
        if (valor == null || valor.isEmpty()) {
            return "";
        }
        return switch (valor.charAt(0)) {
            case '=', '+', '-', '@', '\t', '\r' -> "'" + valor;
            default -> valor;
        };
    }

    private void adicionarNumero(Row row, int coluna, double valor, CellStyle estilo) {
        var cell = row.createCell(coluna);
        cell.setCellValue(valor);
        cell.setCellStyle(estilo);
    }

    private void ajustarColunas(Sheet sheet, int quantidade) {
        for (var coluna = 0; coluna < quantidade; coluna++) {
            sheet.autoSizeColumn(coluna);
        }
    }
}
