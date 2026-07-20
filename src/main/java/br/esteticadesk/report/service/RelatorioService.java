package br.esteticadesk.report.service;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.entity.Receita;
import br.esteticadesk.finance.repository.DespesaRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.report.dto.FiltroPeriodoRelatorio;
import br.esteticadesk.report.dto.RelatorioDTO;
import br.esteticadesk.report.dto.RelatorioDTO.AgendamentoDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.CategoriaDespesaDTO;
import br.esteticadesk.report.dto.RelatorioDTO.DespesaDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.ReceitaDetalheDTO;
import br.esteticadesk.report.dto.RelatorioDTO.ServicoRankingDTO;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RelatorioService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final ReceitaRepository receitas;
    private final DespesaRepository despesas;
    private final AgendamentoRepository agendamentos;
    private final EmpresaRepository empresas;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;

    public RelatorioService(ReceitaRepository receitas, DespesaRepository despesas,
            AgendamentoRepository agendamentos, EmpresaRepository empresas, SessaoUsuario sessao,
            AssinaturaService assinaturas) {
        this.receitas = receitas;
        this.despesas = despesas;
        this.agendamentos = agendamentos;
        this.empresas = empresas;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
    }

    public RelatorioDTO consultar(FiltroPeriodoRelatorio filtro, LocalDate referencia) {
        return consultar(filtro, referencia, null);
    }

    public RelatorioDTO consultar(FiltroPeriodoRelatorio filtro, LocalDate referencia, Long empresaIdSelecionada) {
        if (filtro == null) {
            throw new IllegalArgumentException("O filtro do relatório é obrigatório.");
        }
        assinaturas.exigirRecurso(RecursoPlano.RELATORIO_SIMPLES);

        var empresa = resolverEmpresa(empresaIdSelecionada);
        var empresaId = empresa.getId();
        var plano = sessao.isSuperAdmin() ? PlanoAssinatura.COMPLETO : empresa.getPlano();
        var periodo = filtro.resolver(referencia);
        var receitasPeriodo = receitas.findByEmpresaIdAndDataRecebimentoBetween(
                empresaId, periodo.inicio(), periodo.fim());
        var despesasPeriodo = despesas.findByEmpresaIdAndDataPagamentoBetween(
                empresaId, periodo.inicio(), periodo.fim());
        var agendamentosPeriodo = agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                empresaId, periodo.inicio().atStartOfDay(), periodo.fim().atTime(LocalTime.MAX));

        var receitaTotal = somarReceitas(receitasPeriodo);
        var despesaTotal = somarDespesas(despesasPeriodo);
        var concluidos = agendamentosPeriodo.stream()
                .filter(agendamento -> agendamento.getStatus() == StatusAgendamento.CONCLUIDO)
                .toList();
        var ticketMedio = concluidos.isEmpty()
                ? ZERO
                : receitaTotal.divide(BigDecimal.valueOf(concluidos.size()), 2, RoundingMode.HALF_UP);

        var possuiRelatorioDetalhado = plano.permite(RecursoPlano.RELATORIO_DETALHADO);
        return new RelatorioDTO(
                empresa.getNomeFantasia(),
                plano,
                filtro,
                periodo,
                receitaTotal,
                despesaTotal,
                receitaTotal.subtract(despesaTotal),
                ticketMedio,
                concluidos.size(),
                possuiRelatorioDetalhado ? rankingServicos(concluidos) : List.of(),
                possuiRelatorioDetalhado ? despesasPorCategoria(despesasPeriodo) : List.of(),
                possuiRelatorioDetalhado ? detalhesReceitas(receitasPeriodo) : List.of(),
                possuiRelatorioDetalhado ? detalhesDespesas(despesasPeriodo) : List.of(),
                possuiRelatorioDetalhado ? detalhesAgendamentos(agendamentosPeriodo) : List.of());
    }

    private Empresa resolverEmpresa(Long empresaIdSelecionada) {
        if (empresaIdSelecionada == null || !sessao.isSuperAdmin()) {
            return assinaturas.empresaAtual();
        }
        return empresas.findById(empresaIdSelecionada)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa não encontrada."));
    }

    private BigDecimal somarReceitas(List<Receita> itens) {
        return itens.stream().map(Receita::getValor).reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal somarDespesas(List<Despesa> itens) {
        return itens.stream().map(Despesa::getValor).reduce(ZERO, BigDecimal::add);
    }

    private List<ServicoRankingDTO> rankingServicos(List<Agendamento> concluidos) {
        var totais = new HashMap<String, AcumuladorServico>();
        concluidos.stream()
                .flatMap(agendamento -> agendamento.getServicos().stream())
                .forEach(item -> totais.computeIfAbsent(item.getServico().getNome(), chave -> new AcumuladorServico())
                        .adicionar(item.getPrecoUnitario()));
        return totais.entrySet().stream()
                .map(item -> new ServicoRankingDTO(item.getKey(), item.getValue().quantidade, item.getValue().valor))
                .sorted(Comparator.comparing(ServicoRankingDTO::valor).reversed()
                        .thenComparing(ServicoRankingDTO::nome))
                .toList();
    }

    private List<CategoriaDespesaDTO> despesasPorCategoria(List<Despesa> itens) {
        var totais = new EnumMap<br.esteticadesk.enums.CategoriaDespesa, BigDecimal>(
                br.esteticadesk.enums.CategoriaDespesa.class);
        itens.forEach(item -> totais.merge(item.getCategoria(), item.getValor(), BigDecimal::add));
        return totais.entrySet().stream()
                .map(item -> new CategoriaDespesaDTO(item.getKey().name(), item.getValue()))
                .sorted(Comparator.comparing(CategoriaDespesaDTO::valor).reversed()
                        .thenComparing(CategoriaDespesaDTO::categoria))
                .toList();
    }

    private List<ReceitaDetalheDTO> detalhesReceitas(List<Receita> itens) {
        return itens.stream()
                .sorted(Comparator.comparing(Receita::getDataRecebimento).thenComparing(Receita::getDescricao))
                .map(item -> new ReceitaDetalheDTO(item.getDataRecebimento(), item.getDescricao(),
                        item.getFormaPagamento().getNome(), item.getValor()))
                .toList();
    }

    private List<DespesaDetalheDTO> detalhesDespesas(List<Despesa> itens) {
        return itens.stream()
                .sorted(Comparator.comparing(Despesa::getDataPagamento).thenComparing(Despesa::getDescricao))
                .map(item -> new DespesaDetalheDTO(item.getDataPagamento(), item.getDescricao(),
                        item.getCategoria().name(), item.getValor()))
                .toList();
    }

    private List<AgendamentoDetalheDTO> detalhesAgendamentos(List<Agendamento> itens) {
        var detalhes = new ArrayList<AgendamentoDetalheDTO>(itens.size());
        for (var item : itens) {
            detalhes.add(new AgendamentoDetalheDTO(
                    item.getDataHora(),
                    item.getCliente().getNome(),
                    item.getVeiculo().getPlaca() + " - " + item.getVeiculo().getModelo(),
                    item.nomesServicos(),
                    item.getStatus().name(),
                    item.getTotal()));
        }
        return List.copyOf(detalhes);
    }

    private static final class AcumuladorServico {
        private long quantidade;
        private BigDecimal valor = ZERO;

        private void adicionar(BigDecimal preco) {
            quantidade++;
            valor = valor.add(preco);
        }
    }
}
