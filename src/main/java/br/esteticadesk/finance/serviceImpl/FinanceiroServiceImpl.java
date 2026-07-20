package br.esteticadesk.finance.serviceImpl;

import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.finance.dto.IndicadoresFinanceirosDTO;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.repository.DespesaRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.finance.service.FinanceiroService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FinanceiroServiceImpl implements FinanceiroService {
    private final DespesaRepository despesas;
    private final ReceitaRepository receitas;
    private final AgendamentoRepository agendamentos;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;

    public FinanceiroServiceImpl(DespesaRepository despesas, ReceitaRepository receitas,
            AgendamentoRepository agendamentos, SessaoUsuario sessao, AssinaturaService assinaturas) {
        this.despesas = despesas;
        this.receitas = receitas;
        this.agendamentos = agendamentos;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
    }

    public Despesa registrarDespesa(Despesa despesa) {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        if (despesa.getValor() == null || despesa.getValor().signum() <= 0) {
            throw new IllegalArgumentException("Valor deve ser maior que zero.");
        }
        despesa.setEmpresaId(sessao.empresaObrigatoria());
        return despesas.save(despesa);
    }

    @Transactional(readOnly = true)
    public BigDecimal calcularFluxoCaixa(LocalDate inicio, LocalDate fim) {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var empresaId = sessao.empresaObrigatoria();
        var entradas = somarReceitas(empresaId, inicio, fim);
        var saidas = somarDespesas(empresaId, inicio, fim);
        return entradas.subtract(saidas);
    }

    @Override
    @Transactional(readOnly = true)
    public IndicadoresFinanceirosDTO indicadores() {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var empresaId = sessao.empresaObrigatoria();
        var hoje = HorarioSistema.hoje();
        var inicioSemana = hoje.with(DayOfWeek.MONDAY);
        var inicioMes = hoje.withDayOfMonth(1);
        var inicioAno = hoje.withDayOfYear(1);

        var receitaDia = somarReceitas(empresaId, hoje, hoje);
        var receitaSemana = somarReceitas(empresaId, inicioSemana, hoje);
        var receitaMes = somarReceitas(empresaId, inicioMes, hoje);
        var receitaAno = somarReceitas(empresaId, inicioAno, hoje);
        var totalRecebido = receitaAno;
        var totalDespesas = somarDespesas(empresaId, inicioMes, hoje);
        var totalPendente = agendamentos.sumPendentesByEmpresa(empresaId,
                List.of(StatusAgendamento.EM_ANDAMENTO, StatusAgendamento.CONCLUIDO));
        if (totalPendente == null) {
            totalPendente = BigDecimal.ZERO;
        }
        var lucro = receitaMes.subtract(totalDespesas);
        return new IndicadoresFinanceirosDTO(receitaDia, receitaSemana, receitaMes, receitaAno, totalRecebido,
                totalPendente, totalDespesas, lucro);
    }

    private BigDecimal somarReceitas(Long empresaId, LocalDate inicio, LocalDate fim) {
        return receitas.findByEmpresaIdAndDataRecebimentoBetween(empresaId, inicio, fim).stream()
                .map(r -> r.getValor())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal somarDespesas(Long empresaId, LocalDate inicio, LocalDate fim) {
        return despesas.findByEmpresaIdAndDataPagamentoBetween(empresaId, inicio, fim).stream()
                .map(d -> d.getValor())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
