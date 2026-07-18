package br.esteticadesk.appointment.serviceImpl;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.*;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.appointment.service.AgendamentoService;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.enums.*;
import br.esteticadesk.exception.*;
import br.esteticadesk.finance.entity.Receita;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.inventory.entity.*;
import br.esteticadesk.inventory.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AgendamentoServiceImpl implements AgendamentoService {
    private final AgendamentoRepository agendamentos;
    private final ServicoRepository servicos;
    private final EstoqueRepository estoques;
    private final MovimentacaoEstoqueRepository movimentacoes;
    private final FormaPagamentoRepository formas;
    private final ReceitaRepository receitas;
    private final SessaoUsuario sessao;
    private final LogService logs;

    public AgendamentoServiceImpl(AgendamentoRepository agendamentos, ServicoRepository servicos,
            EstoqueRepository estoques,
            MovimentacaoEstoqueRepository movimentacoes, FormaPagamentoRepository formas, ReceitaRepository receitas,
            SessaoUsuario sessao, LogService logs) {
        this.agendamentos = agendamentos;
        this.servicos = servicos;
        this.estoques = estoques;
        this.movimentacoes = movimentacoes;
        this.formas = formas;
        this.receitas = receitas;
        this.sessao = sessao;
        this.logs = logs;
    }

    public Agendamento criar(Agendamento agendamento) {
        var empresaId = sessao.empresaObrigatoria();
        if (agendamento.getDataHora() == null || !agendamento.getDataHora().isAfter(LocalDateTime.now()))
            throw new IllegalArgumentException("Não é possível agendar no passado.");
        if (agendamento.getServicos() == null || agendamento.getServicos().isEmpty())
            throw new IllegalArgumentException("Selecione ao menos um serviço.");
        agendamento.setEmpresaId(empresaId);
        agendamento.setStatus(StatusAgendamento.AGENDADO);
        agendamento.setPago(false);
        var ids = new HashSet<Long>();
        for (var item : agendamento.getServicos()) {
            var servicoId = item.getServico() == null ? null : item.getServico().getId();
            if (servicoId == null || !ids.add(servicoId)) {
                throw new IllegalArgumentException("Os serviços selecionados são inválidos ou repetidos.");
            }
            item.setServico(servicos.findByIdAndEmpresaIdAndAtivoTrue(servicoId, empresaId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado ou inativo.")));
        }
        var subtotal = agendamento.getServicos().stream()
                .peek(item -> {
                    item.setAgendamento(agendamento);
                    item.setEmpresaId(empresaId);
                    item.setPrecoUnitario(item.getServico().getPreco());
                })
                .map(ServicoAgendamento::getPrecoUnitario)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        var desconto = agendamento.getDesconto() == null ? BigDecimal.ZERO
                : agendamento.getDesconto().setScale(2, RoundingMode.HALF_UP);
        if (desconto.signum() < 0 || desconto.compareTo(subtotal) >= 0)
            throw new IllegalArgumentException("O desconto deve ser menor que o subtotal.");
        agendamento.setSubtotal(subtotal);
        agendamento.setDesconto(desconto);
        agendamento.setTotal(subtotal.subtract(desconto));
        validarConflito(agendamento);
        return agendamentos.save(agendamento);
    }

    private void validarConflito(Agendamento novo) {
        if (novo.getFuncionario() == null)
            return;
        var duracao = novo.tempoEstimadoTotalMinutos();
        var inicio = novo.getDataHora().minusMinutes(duracao);
        var fim = novo.getDataHora().plusMinutes(duracao);
        var existentes = agendamentos.findByEmpresaIdAndFuncionarioIdAndStatusInAndDataHoraBetween(novo.getEmpresaId(),
                novo.getFuncionario().getId(), List.of(StatusAgendamento.AGENDADO, StatusAgendamento.EM_ANDAMENTO),
                inicio, fim);
        for (var existente : existentes) {
            var eInicio = existente.getDataHora();
            var eFim = eInicio.plusMinutes(existente.tempoEstimadoTotalMinutos());
            var nFim = novo.getDataHora().plusMinutes(duracao);
            if (eInicio.isBefore(nFim) && novo.getDataHora().isBefore(eFim))
                throw new ConflitoDeHorarioException();
        }
    }

    public void iniciar(Long id) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO)
            throw new TransicaoDeStatusInvalidaException();
        a.setStatus(StatusAgendamento.EM_ANDAMENTO);
    }

    public void concluir(Long id, List<ItemConsumidoDTO> itens, boolean pago, Long formaPagamentoId) {
        var empresaId = sessao.empresaObrigatoria();
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.EM_ANDAMENTO)
            throw new TransicaoDeStatusInvalidaException();
        var consumos = new ArrayList<Estoque>();
        var itensInformados = itens == null ? List.<ItemConsumidoDTO>of() : itens;
        for (var item : itensInformados) {
            var estoque = estoques.findByEmpresaIdAndProdutoId(empresaId, item.produtoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
            if (estoque.getQuantidadeAtual().compareTo(item.quantidade()) < 0)
                throw new EstoqueInsuficienteException(estoque.getProduto().getNome());
            consumos.add(estoque);
        }
        for (int i = 0; i < itensInformados.size(); i++) {
            var item = itensInformados.get(i);
            var estoque = consumos.get(i);
            estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().subtract(item.quantidade()));
            var mov = new MovimentacaoEstoque();
            mov.setEmpresaId(empresaId);
            mov.setProduto(estoque.getProduto());
            mov.setQuantidade(item.quantidade());
            mov.setTipo(TipoMovimentacao.SAIDA);
            mov.setOrigem(OrigemMovimentacao.AGENDAMENTO);
            mov.setAgendamento(a);
            movimentacoes.save(mov);
            if (estoque.getQuantidadeAtual().compareTo(estoque.getQuantidadeMinima()) <= 0)
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Estoque mínimo atingido: {}",
                        estoque.getProduto().getNome());
        }
        a.setStatus(StatusAgendamento.CONCLUIDO);
        if (pago) {
            registrarReceita(a, formaPagamentoId);
        }
        logs.registrar(empresaId, null, "SERVICO_FINALIZADO", "Agendamento " + a.getId());
    }

    public void registrarPagamento(Long id, Long formaPagamentoId) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.CONCLUIDO)
            throw new TransicaoDeStatusInvalidaException();
        registrarReceita(a, formaPagamentoId);
    }

    public void cancelar(Long id) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO && a.getStatus() != StatusAgendamento.EM_ANDAMENTO)
            throw new TransicaoDeStatusInvalidaException();
        a.setStatus(StatusAgendamento.CANCELADO);
        logs.registrar(a.getEmpresaId(), null, "AGENDAMENTO_CANCELADO", "Agendamento " + a.getId());
    }

    private Agendamento obterParaAtualizacao(Long id) {
        return agendamentos.findByIdAndEmpresaIdForUpdate(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));
    }

    private void registrarReceita(Agendamento agendamento, Long formaPagamentoId) {
        if (Boolean.TRUE.equals(agendamento.getPago())) {
            return;
        }
        if (formaPagamentoId == null) {
            throw new IllegalArgumentException("Selecione a forma de pagamento.");
        }
        var empresaId = agendamento.getEmpresaId();
        var forma = formas.findByIdAndEmpresaIdAndAtivoTrue(formaPagamentoId, empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Forma de pagamento não encontrada."));
        var receita = new Receita();
        receita.setEmpresaId(empresaId);
        receita.setAgendamento(agendamento);
        receita.setFormaPagamento(forma);
        receita.setDescricao("Serviços: " + agendamento.nomesServicos());
        receita.setValor(agendamento.getTotal());
        receita.setDataRecebimento(LocalDate.now());
        receitas.save(receita);
        agendamento.setPago(true);
        logs.registrar(empresaId, null, "PAGAMENTO_REGISTRADO", "Agendamento " + agendamento.getId());
    }
}
