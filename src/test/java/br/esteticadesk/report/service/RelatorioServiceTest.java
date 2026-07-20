package br.esteticadesk.report.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.entity.ServicoAgendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.enums.CategoriaDespesa;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.entity.FormaPagamento;
import br.esteticadesk.finance.entity.Receita;
import br.esteticadesk.finance.repository.DespesaRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.report.dto.FiltroPeriodoRelatorio;
import br.esteticadesk.vehicle.entity.Veiculo;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RelatorioServiceTest {

    private ReceitaRepository receitas;
    private DespesaRepository despesas;
    private AgendamentoRepository agendamentos;
    private EmpresaRepository empresas;
    private SessaoUsuario sessao;
    private AssinaturaService assinaturas;
    private RelatorioService service;
    private Empresa empresa;

    @BeforeEach
    void configurar() {
        receitas = mock(ReceitaRepository.class);
        despesas = mock(DespesaRepository.class);
        agendamentos = mock(AgendamentoRepository.class);
        empresas = mock(EmpresaRepository.class);
        sessao = mock(SessaoUsuario.class);
        assinaturas = mock(AssinaturaService.class);
        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNomeFantasia("Empresa teste");
        empresa.setPlano(PlanoAssinatura.COMPLETO);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(assinaturas.empresaAtual()).thenReturn(empresa);
        service = new RelatorioService(receitas, despesas, agendamentos, empresas, sessao, assinaturas);
    }

    @Test
    void calculaResumoERankingsComDadosSomenteDaEmpresaEPeriodo() {
        var referencia = LocalDate.of(2026, 7, 18);
        when(receitas.findByEmpresaIdAndDataRecebimentoBetween(7L,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(List.of(receita("100.00"), receita("50.00")));
        when(despesas.findByEmpresaIdAndDataPagamentoBetween(7L,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)))
                .thenReturn(List.of(despesa("20.00", CategoriaDespesa.FIXA),
                        despesa("30.00", CategoriaDespesa.VARIAVEL)));
        when(agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                7L, LocalDate.of(2026, 7, 1).atStartOfDay(), LocalDate.of(2026, 7, 31).atTime(LocalTime.MAX)))
                .thenReturn(List.of(
                        agendamento(StatusAgendamento.CONCLUIDO, linha("Lavagem", "80.00"), linha("Cera", "20.00")),
                        agendamento(StatusAgendamento.CONCLUIDO, linha("Lavagem", "70.00")),
                        agendamento(StatusAgendamento.CANCELADO, linha("Ignorado", "999.00"))));

        var relatorio = service.consultar(FiltroPeriodoRelatorio.MES, referencia);

        assertEquals(new BigDecimal("150.00"), relatorio.receita());
        assertEquals(new BigDecimal("50.00"), relatorio.despesa());
        assertEquals(new BigDecimal("100.00"), relatorio.saldo());
        assertEquals(new BigDecimal("75.00"), relatorio.ticketMedio());
        assertEquals(2, relatorio.agendamentosConcluidos());
        assertEquals("Lavagem", relatorio.servicos().getFirst().nome());
        assertEquals(2, relatorio.servicos().getFirst().quantidade());
        assertEquals(new BigDecimal("150.00"), relatorio.servicos().getFirst().valor());
        assertEquals(2, relatorio.categorias().size());
        assertEquals(2, relatorio.receitas().size());
        assertEquals(2, relatorio.despesas().size());
        assertEquals(3, relatorio.agendamentos().size());
        verify(assinaturas).exigirRecurso(RecursoPlano.RELATORIO_SIMPLES);
    }

    @Test
    void planoBasicoRetornaSomenteKpis() {
        empresa.setPlano(PlanoAssinatura.BASICO);
        prepararListasVazias();

        var relatorio = service.consultar(FiltroPeriodoRelatorio.DIA, LocalDate.of(2026, 7, 18));

        assertEquals(PlanoAssinatura.BASICO, relatorio.plano());
        assertTrue(relatorio.servicos().isEmpty());
        assertTrue(relatorio.categorias().isEmpty());
        assertTrue(relatorio.receitas().isEmpty());
        assertTrue(relatorio.agendamentos().isEmpty());
    }

    @Test
    void superAdminRecebeVisaoCompletaSemRestricaoDePlano() {
        empresa.setPlano(PlanoAssinatura.BASICO);
        when(sessao.isSuperAdmin()).thenReturn(true);
        prepararListasVazias();

        var relatorio = service.consultar(FiltroPeriodoRelatorio.DIA, LocalDate.of(2026, 7, 18));

        assertEquals(PlanoAssinatura.COMPLETO, relatorio.plano());
        assertTrue(relatorio.possuiDetalhes());
    }

    private void prepararListasVazias() {
        var data = LocalDate.of(2026, 7, 18);
        when(receitas.findByEmpresaIdAndDataRecebimentoBetween(7L, data, data)).thenReturn(List.of());
        when(despesas.findByEmpresaIdAndDataPagamentoBetween(7L, data, data)).thenReturn(List.of());
        when(agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                7L, data.atStartOfDay(), data.atTime(LocalTime.MAX))).thenReturn(List.of());
    }

    private Receita receita(String valor) {
        var forma = new FormaPagamento();
        forma.setNome("PIX");
        var receita = new Receita();
        receita.setDescricao("Receita");
        receita.setDataRecebimento(LocalDate.of(2026, 7, 10));
        receita.setFormaPagamento(forma);
        receita.setValor(new BigDecimal(valor));
        return receita;
    }

    private Despesa despesa(String valor, CategoriaDespesa categoria) {
        var despesa = new Despesa();
        despesa.setDescricao("Despesa");
        despesa.setDataPagamento(LocalDate.of(2026, 7, 11));
        despesa.setCategoria(categoria);
        despesa.setValor(new BigDecimal(valor));
        return despesa;
    }

    private Agendamento agendamento(StatusAgendamento status, ServicoAgendamento... linhas) {
        var cliente = new Cliente();
        cliente.setNome("Cliente");
        var veiculo = new Veiculo();
        veiculo.setPlaca("ABC1D23");
        veiculo.setModelo("Modelo");
        var agendamento = new Agendamento();
        agendamento.setDataHora(LocalDate.of(2026, 7, 12).atTime(10, 0));
        agendamento.setStatus(status);
        agendamento.setCliente(cliente);
        agendamento.setVeiculo(veiculo);
        agendamento.setTotal(new BigDecimal("100.00"));
        agendamento.getServicos().addAll(List.of(linhas));
        return agendamento;
    }

    private ServicoAgendamento linha(String nome, String valor) {
        var servico = new Servico();
        servico.setNome(nome);
        var linha = new ServicoAgendamento();
        linha.setServico(servico);
        linha.setPrecoUnitario(new BigDecimal(valor));
        return linha;
    }
}
