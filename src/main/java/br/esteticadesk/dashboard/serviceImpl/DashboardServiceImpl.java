package br.esteticadesk.dashboard.serviceImpl;

import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.dashboard.dto.*;
import br.esteticadesk.dashboard.service.DashboardService;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.finance.repository.*;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {
    private final SessaoUsuario sessao;
    private final ReceitaRepository receitas;
    private final DespesaRepository despesas;
    private final AgendamentoRepository agendamentos;
    private final EstoqueRepository estoques;

    public DashboardServiceImpl(SessaoUsuario sessao, ReceitaRepository receitas, DespesaRepository despesas,
            AgendamentoRepository agendamentos, EstoqueRepository estoques) {
        this.sessao = sessao;
        this.receitas = receitas;
        this.despesas = despesas;
        this.agendamentos = agendamentos;
        this.estoques = estoques;
    }

    public DashboardDTO carregar(LocalDate inicio, LocalDate fim) {
        var empresaId = sessao.empresaObrigatoria();
        var rs = receitas.findByEmpresaIdAndDataRecebimentoBetween(empresaId, inicio, fim);
        var ds = despesas.findByEmpresaIdAndDataPagamentoBetween(empresaId, inicio, fim);
        var todos = agendamentos.findByEmpresaId(empresaId);
        var receita = somaReceitas(rs);
        var despesa = somaDespesas(ds);
        var concluidos = todos.stream().filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO
                && noPeriodo(a.getDataHora().toLocalDate(), inicio, fim)).toList();
        var hoje = LocalDate.now();
        var agendaHoje = todos.stream().filter(a -> a.getDataHora().toLocalDate().equals(hoje)
                && (a.getStatus() == StatusAgendamento.AGENDADO || a.getStatus() == StatusAgendamento.EM_ANDAMENTO))
                .sorted(Comparator.comparing(a -> a.getDataHora()))
                .map(a -> new AgendamentoResumoDTO(a.getId(), a.getDataHora(), a.getCliente().getNome(),
                        a.getVeiculo().getModelo() + " " + a.getVeiculo().getPlaca(), a.getServico().getNome(),
                        a.getStatus().name()))
                .toList();
        var ticket = concluidos.isEmpty() ? BigDecimal.ZERO
                : rs.stream().filter(r -> r.getAgendamento() != null).map(r -> r.getValor())
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(concluidos.size()), 2, java.math.RoundingMode.HALF_UP);
        var alertas = estoques.findByEmpresaId(empresaId).stream()
                .filter(e -> e.getQuantidadeAtual().compareTo(e.getQuantidadeMinima()) <= 0)
                .sorted(Comparator.comparing(e -> e.getQuantidadeAtual().subtract(e.getQuantidadeMinima())))
                .map(e -> new AlertaEstoqueDTO(e.getProduto().getId(), e.getProduto().getNome(), e.getQuantidadeAtual(),
                        e.getQuantidadeMinima()))
                .toList();
        return new DashboardDTO(receita, despesa, receita.subtract(despesa), ticket, agendaHoje.size(),
                concluidos.size(), faturamento(empresaId), servicos(todos, inicio, fim), despesasPorCategoria(ds),
                alertas, agendaHoje);
    }

    private List<FaturamentoMensalDTO> faturamento(Long empresaId) {
        var lista = new ArrayList<FaturamentoMensalDTO>();
        for (int i = 5; i >= 0; i--) {
            var mes = YearMonth.now().minusMonths(i);
            var total = somaReceitas(
                    receitas.findByEmpresaIdAndDataRecebimentoBetween(empresaId, mes.atDay(1), mes.atEndOfMonth()));
            lista.add(new FaturamentoMensalDTO(mes.getMonth().getDisplayName(TextStyle.SHORT, new Locale("pt", "BR")),
                    total));
        }
        return lista;
    }

    private List<ServicoMaisVendidoDTO> servicos(List<br.esteticadesk.appointment.entity.Agendamento> todos,
            LocalDate i, LocalDate f) {
        return todos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO
                        && noPeriodo(a.getDataHora().toLocalDate(), i, f))
                .collect(Collectors.groupingBy(a -> a.getServico().getNome(), Collectors.counting())).entrySet()
                .stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                .map(e -> new ServicoMaisVendidoDTO(e.getKey(), e.getValue())).toList();
    }

    private List<DespesaPorCategoriaDTO> despesasPorCategoria(List<br.esteticadesk.finance.entity.Despesa> lista) {
        return lista.stream()
                .collect(Collectors.groupingBy(d -> d.getCategoria().name(),
                        Collectors.reducing(BigDecimal.ZERO, d -> d.getValor(), BigDecimal::add)))
                .entrySet().stream().map(e -> new DespesaPorCategoriaDTO(e.getKey(), e.getValue())).toList();
    }

    private BigDecimal somaReceitas(List<br.esteticadesk.finance.entity.Receita> lista) {
        return lista.stream().map(r -> r.getValor()).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal somaDespesas(List<br.esteticadesk.finance.entity.Despesa> lista) {
        return lista.stream().map(d -> d.getValor()).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean noPeriodo(LocalDate d, LocalDate i, LocalDate f) {
        return !d.isBefore(i) && !d.isAfter(f);
    }
}
