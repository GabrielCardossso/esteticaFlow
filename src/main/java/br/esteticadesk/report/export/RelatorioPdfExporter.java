package br.esteticadesk.report.export;

import br.esteticadesk.report.dto.RelatorioDTO;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class RelatorioPdfExporter {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Font TITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
    private static final Font SUBTITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font CABECALHO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
    private static final Font TEXTO = FontFactory.getFont(FontFactory.HELVETICA, 9);

    public byte[] exportar(RelatorioDTO relatorio) throws IOException {
        try (var output = new ByteArrayOutputStream()) {
            var documento = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
            try {
                PdfWriter.getInstance(documento, output);
                documento.open();
                escreverCabecalho(documento, relatorio);
                escreverResumo(documento, relatorio);
                if (relatorio.possuiRankings()) {
                    escreverRankings(documento, relatorio);
                }
                if (relatorio.possuiDetalhes()) {
                    escreverDetalhes(documento, relatorio);
                }
            } catch (DocumentException exception) {
                throw new IOException("Não foi possível gerar o relatório em PDF.", exception);
            } finally {
                if (documento.isOpen()) {
                    documento.close();
                }
            }
            return output.toByteArray();
        }
    }

    private void escreverCabecalho(Document documento, RelatorioDTO relatorio) throws DocumentException {
        documento.add(new Paragraph("Relatório gerencial", TITULO));
        documento.add(new Paragraph(relatorio.empresa() + " | Plano " + relatorio.plano(), TEXTO));
        documento.add(new Paragraph("Período: " + DATA.format(relatorio.periodo().inicio())
                + " a " + DATA.format(relatorio.periodo().fim()), TEXTO));
        documento.add(new Paragraph(" "));
    }

    private void escreverResumo(Document documento, RelatorioDTO relatorio) throws DocumentException {
        documento.add(new Paragraph("Resumo", SUBTITULO));
        var tabela = tabela(5, "Receita", "Despesa", "Saldo", "Ticket médio", "Concluídos");
        tabela.addCell(celula(moeda(relatorio.receita())));
        tabela.addCell(celula(moeda(relatorio.despesa())));
        tabela.addCell(celula(moeda(relatorio.saldo())));
        tabela.addCell(celula(moeda(relatorio.ticketMedio())));
        tabela.addCell(celula(Long.toString(relatorio.agendamentosConcluidos())));
        documento.add(tabela);
    }

    private void escreverRankings(Document documento, RelatorioDTO relatorio) throws DocumentException {
        documento.add(new Paragraph(" "));
        documento.add(new Paragraph("Ranking de serviços", SUBTITULO));
        var servicos = tabela(3, "Serviço", "Quantidade", "Valor");
        relatorio.servicos().forEach(item -> {
            servicos.addCell(celula(item.nome()));
            servicos.addCell(celula(Long.toString(item.quantidade())));
            servicos.addCell(celula(moeda(item.valor())));
        });
        documento.add(servicos);

        documento.add(new Paragraph(" "));
        documento.add(new Paragraph("Despesas por categoria", SUBTITULO));
        var categorias = tabela(2, "Categoria", "Valor");
        relatorio.categorias().forEach(item -> {
            categorias.addCell(celula(item.categoria()));
            categorias.addCell(celula(moeda(item.valor())));
        });
        documento.add(categorias);
    }

    private void escreverDetalhes(Document documento, RelatorioDTO relatorio) throws DocumentException {
        documento.newPage();
        documento.add(new Paragraph("Receitas", SUBTITULO));
        var receitas = tabela(4, "Data", "Descrição", "Forma", "Valor");
        relatorio.receitas().forEach(item -> {
            receitas.addCell(celula(DATA.format(item.data())));
            receitas.addCell(celula(item.descricao()));
            receitas.addCell(celula(item.formaPagamento()));
            receitas.addCell(celula(moeda(item.valor())));
        });
        documento.add(receitas);

        documento.add(new Paragraph(" "));
        documento.add(new Paragraph("Despesas", SUBTITULO));
        var despesas = tabela(4, "Data", "Descrição", "Categoria", "Valor");
        relatorio.despesas().forEach(item -> {
            despesas.addCell(celula(DATA.format(item.data())));
            despesas.addCell(celula(item.descricao()));
            despesas.addCell(celula(item.categoria()));
            despesas.addCell(celula(moeda(item.valor())));
        });
        documento.add(despesas);

        documento.add(new Paragraph(" "));
        documento.add(new Paragraph("Agendamentos", SUBTITULO));
        var agendamentos = tabela(6, "Data", "Cliente", "Veículo", "Serviços", "Status", "Total");
        relatorio.agendamentos().forEach(item -> {
            agendamentos.addCell(celula(DATA_HORA.format(item.dataHora())));
            agendamentos.addCell(celula(item.cliente()));
            agendamentos.addCell(celula(item.veiculo()));
            agendamentos.addCell(celula(item.servicos()));
            agendamentos.addCell(celula(item.status()));
            agendamentos.addCell(celula(moeda(item.total())));
        });
        documento.add(agendamentos);
    }

    private PdfPTable tabela(int colunas, String... cabecalhos) {
        var tabela = new PdfPTable(colunas);
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(5);
        for (var cabecalho : cabecalhos) {
            tabela.addCell(new PdfPCell(new Phrase(cabecalho, CABECALHO)));
        }
        return tabela;
    }

    private PdfPCell celula(String valor) {
        return new PdfPCell(new Phrase(valor, TEXTO));
    }

    private String moeda(BigDecimal valor) {
        return "R$ " + valor.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}
