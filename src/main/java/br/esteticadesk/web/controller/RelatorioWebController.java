package br.esteticadesk.web.controller;

import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.report.dto.FiltroPeriodoRelatorio;
import br.esteticadesk.report.export.RelatorioExcelExporter;
import br.esteticadesk.report.export.RelatorioPdfExporter;
import br.esteticadesk.report.service.RelatorioService;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/relatorios")
public class RelatorioWebController {

    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final DateTimeFormatter NOME_DATA = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RelatorioService relatorios;
    private final RelatorioPdfExporter pdfExporter;
    private final RelatorioExcelExporter excelExporter;
    private final AssinaturaService assinaturas;

    public RelatorioWebController(RelatorioService relatorios, RelatorioPdfExporter pdfExporter,
            RelatorioExcelExporter excelExporter, AssinaturaService assinaturas) {
        this.relatorios = relatorios;
        this.pdfExporter = pdfExporter;
        this.excelExporter = excelExporter;
        this.assinaturas = assinaturas;
    }

    @GetMapping
    public String index(
            @RequestParam(required = false) FiltroPeriodoRelatorio filtro,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referencia,
            Model model) {
        assinaturas.exigirRecurso(RecursoPlano.RELATORIO_SIMPLES);
        model.addAttribute("menuAtivo", "relatorios");
        model.addAttribute("filtros", FiltroPeriodoRelatorio.values());
        model.addAttribute("filtroSelecionado", filtro);
        model.addAttribute("dataReferencia", referencia == null ? LocalDate.now() : referencia);
        if (filtro != null) {
            model.addAttribute("relatorio", relatorios.consultar(filtro, referencia));
        }
        return "report/index";
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> pdf(
            @RequestParam FiltroPeriodoRelatorio filtro,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referencia) {
        assinaturas.exigirRecurso(RecursoPlano.PDF);
        var relatorio = relatorios.consultar(filtro, referencia);
        try {
            return download(pdfExporter.exportar(relatorio), MediaType.APPLICATION_PDF,
                    nomeArquivo(relatorio.periodo().inicio(), relatorio.periodo().fim(), "pdf"));
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível gerar o relatório em PDF.", exception);
        }
    }

    @GetMapping("/excel")
    public ResponseEntity<byte[]> excel(
            @RequestParam FiltroPeriodoRelatorio filtro,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referencia) {
        assinaturas.exigirRecurso(RecursoPlano.EXCEL);
        var relatorio = relatorios.consultar(filtro, referencia);
        try {
            return download(excelExporter.exportar(relatorio), XLSX,
                    nomeArquivo(relatorio.periodo().inicio(), relatorio.periodo().fim(), "xlsx"));
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível gerar o relatório em Excel.", exception);
        }
    }

    private ResponseEntity<byte[]> download(byte[] conteudo, MediaType contentType, String nomeArquivo) {
        var headers = new HttpHeaders();
        headers.setContentType(contentType);
        headers.setContentDisposition(ContentDisposition.attachment().filename(nomeArquivo).build());
        headers.setContentLength(conteudo.length);
        return ResponseEntity.ok().headers(headers).body(conteudo);
    }

    private String nomeArquivo(LocalDate inicio, LocalDate fim, String extensao) {
        return "relatorio_" + NOME_DATA.format(inicio) + "_a_" + NOME_DATA.format(fim) + "." + extensao;
    }
}
