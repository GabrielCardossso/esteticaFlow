package br.esteticadesk.appointment.serviceImpl;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.entity.ServicoAgendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.appointment.service.AgendamentoService;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.enums.OrigemMovimentacao;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.enums.TipoMovimentacao;
import br.esteticadesk.exception.ConflitoDeHorarioException;
import br.esteticadesk.exception.EstoqueInsuficienteException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.exception.SlotOcupadoConfirmacaoException;
import br.esteticadesk.exception.TransicaoDeStatusInvalidaException;
import br.esteticadesk.finance.entity.Receita;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import br.esteticadesk.inventory.repository.MovimentacaoEstoqueRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AgendamentoServiceImpl implements AgendamentoService {
    private static final List<StatusAgendamento> STATUS_OCUPADOS =
            List.of(StatusAgendamento.AGENDADO, StatusAgendamento.EM_ANDAMENTO);

    private final AgendamentoRepository agendamentos;
    private final ServicoRepository servicos;
    private final EstoqueRepository estoques;
    private final MovimentacaoEstoqueRepository movimentacoes;
    private final FormaPagamentoRepository formas;
    private final ReceitaRepository receitas;
    private final SessaoUsuario sessao;
    private final LogService logs;

    public AgendamentoServiceImpl(AgendamentoRepository agendamentos, ServicoRepository servicos,
            EstoqueRepository estoques, MovimentacaoEstoqueRepository movimentacoes, FormaPagamentoRepository formas,
            ReceitaRepository receitas, SessaoUsuario sessao, LogService logs) {
        this.agendamentos = agendamentos;
        this.servicos = servicos;
        this.estoques = estoques;
        this.movimentacoes = movimentacoes;
        this.formas = formas;
        this.receitas = receitas;
        this.sessao = sessao;
        this.logs = logs;
    }

    @Override
    public Agendamento criar(Agendamento agendamento, boolean confirmarSlotOcupado) {
        var empresaId = sessao.empresaObrigatoria();
        if (agendamento.getDataHora() == null || agendamento.getDataHora().isBefore(HorarioSistema.agoraNoMinuto())) {
            throw new IllegalArgumentException("Não é possível agendar no passado.");
        }
        if (agendamento.getServicos() == null || agendamento.getServicos().isEmpty()) {
            throw new IllegalArgumentException("Selecione ao menos um serviço.");
        }
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
        if (desconto.signum() < 0 || desconto.compareTo(subtotal) >= 0) {
            throw new IllegalArgumentException("O desconto deve ser menor que o subtotal.");
        }
        agendamento.setSubtotal(subtotal);
        agendamento.setDesconto(desconto);
        agendamento.setTotal(subtotal.subtract(desconto));
        validarConflito(agendamento, confirmarSlotOcupado);
        var salvo = agendamentos.save(agendamento);
        logs.registrar(empresaId, null, "AGENDAMENTO_CRIADO", "Agendamento " + salvo.getId());
        return salvo;
    }

    private void validarConflito(Agendamento novo, boolean confirmarSlotOcupado) {
        var dia = novo.getDataHora().toLocalDate();
        var existentes = agendamentos.findAtivosNoPeriodo(novo.getEmpresaId(), STATUS_OCUPADOS,
                HorarioSistema.inicioDoDia(dia), HorarioSistema.fimDoDia(dia));
        var nInicio = novo.getDataHora();
        var nFim = nInicio.plusMinutes(Math.max(1, novo.tempoEstimadoTotalMinutos()));

        for (var existente : existentes) {
            var eInicio = existente.getDataHora();
            var eFim = eInicio.plusMinutes(Math.max(1, existente.tempoEstimadoTotalMinutos()));
            if (!(eInicio.isBefore(nFim) && nInicio.isBefore(eFim))) {
                continue;
            }
            if (novo.getFuncionario() != null && existente.getFuncionario() != null
                    && novo.getFuncionario().getId().equals(existente.getFuncionario().getId())) {
                throw new ConflitoDeHorarioException();
            }
            if (novo.getFuncionario() == null && !confirmarSlotOcupado) {
                throw new SlotOcupadoConfirmacaoException();
            }
        }
    }

    @Override
    public void iniciar(Long id) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO) {
            throw new TransicaoDeStatusInvalidaException();
        }
        a.setStatus(StatusAgendamento.EM_ANDAMENTO);
        logs.registrar(a.getEmpresaId(), null, "ATENDIMENTO_INICIADO", "Agendamento " + a.getId());
    }

    @Override
    public void marcarPago(Long id, Long formaPagamentoId) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.EM_ANDAMENTO && a.getStatus() != StatusAgendamento.CONCLUIDO) {
            throw new TransicaoDeStatusInvalidaException();
        }
        registrarReceita(a, formaPagamentoId);
    }

    @Override
    public void concluir(Long id, List<ItemConsumidoDTO> itens, Long formaPagamentoIdSePendente) {
        var empresaId = sessao.empresaObrigatoria();
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.EM_ANDAMENTO) {
            throw new TransicaoDeStatusInvalidaException();
        }
        baixarEstoque(a, itens == null ? List.of() : itens, empresaId);
        a.setStatus(StatusAgendamento.CONCLUIDO);
        if (!Boolean.TRUE.equals(a.getPago()) && formaPagamentoIdSePendente != null) {
            registrarReceita(a, formaPagamentoIdSePendente);
        }
        logs.registrar(empresaId, null, "SERVICO_FINALIZADO", "Agendamento " + a.getId());
    }

    @Override
    public void registrarPagamento(Long id, Long formaPagamentoId) {
        marcarPago(id, formaPagamentoId);
    }

    @Override
    public void cancelar(Long id) {
        var a = obterParaAtualizacao(id);
        if (a.getStatus() != StatusAgendamento.AGENDADO && a.getStatus() != StatusAgendamento.EM_ANDAMENTO) {
            throw new TransicaoDeStatusInvalidaException();
        }
        a.setStatus(StatusAgendamento.CANCELADO);
        logs.registrar(a.getEmpresaId(), null, "AGENDAMENTO_CANCELADO", "Agendamento " + a.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Agendamento buscarDetalhe(Long id) {
        return agendamentos.findDetalheByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));
    }

    private void baixarEstoque(Agendamento a, List<ItemConsumidoDTO> itensInformados, Long empresaId) {
        var consumos = new ArrayList<Estoque>();
        for (var item : itensInformados) {
            var estoque = estoques.findByEmpresaIdAndProdutoId(empresaId, item.produtoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
            if (estoque.getQuantidadeAtual().compareTo(item.quantidade()) < 0) {
                throw new EstoqueInsuficienteException(estoque.getProduto().getNome());
            }
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
            if (estoque.getQuantidadeAtual().compareTo(estoque.getQuantidadeMinima()) <= 0) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Estoque mínimo atingido: {}",
                        estoque.getProduto().getNome());
            }
        }
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
        receita.setDataRecebimento(HorarioSistema.hoje());
        receitas.save(receita);
        agendamento.setPago(true);
        logs.registrar(empresaId, null, "PAGAMENTO_REGISTRADO", "Agendamento " + agendamento.getId());
    }
}
