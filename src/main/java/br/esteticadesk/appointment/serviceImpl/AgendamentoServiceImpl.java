package br.esteticadesk.appointment.serviceImpl;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.*;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
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
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AgendamentoServiceImpl implements AgendamentoService {
    private final AgendamentoRepository agendamentos;
    private final EstoqueRepository estoques;
    private final MovimentacaoEstoqueRepository movimentacoes;
    private final FormaPagamentoRepository formas;
    private final ReceitaRepository receitas;
    private final SessaoUsuario sessao;
    private final LogService logs;

    public AgendamentoServiceImpl(AgendamentoRepository agendamentos, EstoqueRepository estoques,
            MovimentacaoEstoqueRepository movimentacoes, FormaPagamentoRepository formas, ReceitaRepository receitas,
            SessaoUsuario sessao, LogService logs) {
        this.agendamentos = agendamentos;
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
        agendamento.setEmpresaId(empresaId);
        agendamento.setStatus(StatusAgendamento.AGENDADO);
        validarConflito(agendamento);
        return agendamentos.save(agendamento);
    }

    private void validarConflito(Agendamento novo) {
        if (novo.getFuncionario() == null)
            return;
        var inicio = novo.getDataHora().minusMinutes(novo.getServico().getTempoEstimadoMinutos());
        var fim = novo.getDataHora().plusMinutes(novo.getServico().getTempoEstimadoMinutos());
        var existentes = agendamentos.findByEmpresaIdAndFuncionarioIdAndStatusInAndDataHoraBetween(novo.getEmpresaId(),
                novo.getFuncionario().getId(), List.of(StatusAgendamento.AGENDADO, StatusAgendamento.EM_ANDAMENTO),
                inicio, fim);
        for (var existente : existentes) {
            var eInicio = existente.getDataHora();
            var eFim = eInicio.plusMinutes(existente.getServico().getTempoEstimadoMinutos());
            var nFim = novo.getDataHora().plusMinutes(novo.getServico().getTempoEstimadoMinutos());
            if (eInicio.isBefore(nFim) && novo.getDataHora().isBefore(eFim))
                throw new ConflitoDeHorarioException();
        }
    }

    public void iniciar(Long id) {
        var a = obter(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO)
            throw new TransicaoDeStatusInvalidaException();
        a.setStatus(StatusAgendamento.EM_ANDAMENTO);
    }

    public void finalizarServico(Long id, List<ItemConsumidoDTO> itens, Long formaPagamentoId) {
        var empresaId = sessao.empresaObrigatoria();
        var a = obter(id);
        if (a.getStatus() != StatusAgendamento.EM_ANDAMENTO)
            throw new TransicaoDeStatusInvalidaException();
        var consumos = new ArrayList<Estoque>();
        for (var item : itens) {
            var estoque = estoques.findByEmpresaIdAndProdutoId(empresaId, item.produtoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
            if (estoque.getQuantidadeAtual().compareTo(item.quantidade()) < 0)
                throw new EstoqueInsuficienteException(estoque.getProduto().getNome());
            consumos.add(estoque);
        }
        for (int i = 0; i < itens.size(); i++) {
            var item = itens.get(i);
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
        var forma = formas.findByIdAndEmpresaIdAndAtivoTrue(formaPagamentoId, empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Forma de pagamento não encontrada."));
        var receita = new Receita();
        receita.setEmpresaId(empresaId);
        receita.setAgendamento(a);
        receita.setFormaPagamento(forma);
        receita.setDescricao("Serviço: " + a.getServico().getNome());
        receita.setValor(a.getServico().getPreco());
        receita.setDataRecebimento(LocalDate.now());
        receitas.save(receita);
        a.setStatus(StatusAgendamento.CONCLUIDO);
        logs.registrar(empresaId, null, "SERVICO_FINALIZADO", "Agendamento " + a.getId());
    }

    public void cancelar(Long id) {
        var a = obter(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO && a.getStatus() != StatusAgendamento.EM_ANDAMENTO)
            throw new TransicaoDeStatusInvalidaException();
        a.setStatus(StatusAgendamento.CANCELADO);
        logs.registrar(a.getEmpresaId(), null, "AGENDAMENTO_CANCELADO", "Agendamento " + a.getId());
    }

    private Agendamento obter(Long id) {
        return agendamentos.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));
    }
}
