package br.esteticadesk.appointment.serviceImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.entity.ServicoAgendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.finance.entity.FormaPagamento;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import br.esteticadesk.inventory.repository.MovimentacaoEstoqueRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AgendamentoServiceImplTest {
    private AgendamentoRepository agendamentos;
    private FormaPagamentoRepository formas;
    private ReceitaRepository receitas;
    private ServicoRepository servicos;
    private SessaoUsuario sessao;
    private AgendamentoServiceImpl service;

    @BeforeEach
    void configurar() {
        agendamentos = mock(AgendamentoRepository.class);
        formas = mock(FormaPagamentoRepository.class);
        receitas = mock(ReceitaRepository.class);
        servicos = mock(ServicoRepository.class);
        sessao = mock(SessaoUsuario.class);
        when(sessao.empresaObrigatoria()).thenReturn(1L);
        service = new AgendamentoServiceImpl(agendamentos, servicos, mock(EstoqueRepository.class),
                mock(MovimentacaoEstoqueRepository.class), formas, receitas, sessao, mock(LogService.class));
    }

    @Test
    void calculaTotaisComPrecosCongeladosEDesconto() {
        var agendamento = new Agendamento();
        agendamento.setDataHora(LocalDateTime.now().plusDays(1));
        agendamento.setDesconto(new BigDecimal("15.00"));
        agendamento.getServicos().add(linha("100.00"));
        agendamento.getServicos().add(linha("50.00"));
        for (var linha : agendamento.getServicos()) {
            when(servicos.findByIdAndEmpresaIdAndAtivoTrue(linha.getServico().getId(), 1L))
                    .thenReturn(Optional.of(linha.getServico()));
        }
        when(agendamentos.save(agendamento)).thenReturn(agendamento);

        service.criar(agendamento);

        assertEquals(new BigDecimal("150.00"), agendamento.getSubtotal());
        assertEquals(new BigDecimal("15.00"), agendamento.getDesconto());
        assertEquals(new BigDecimal("135.00"), agendamento.getTotal());
        assertEquals(Boolean.FALSE, agendamento.getPago());
    }

    @Test
    void pagamentoRepetidoNaoCriaReceitaDuplicada() {
        var agendamento = new Agendamento();
        agendamento.setId(10L);
        agendamento.setEmpresaId(1L);
        agendamento.setStatus(StatusAgendamento.CONCLUIDO);
        agendamento.setPago(false);
        agendamento.setTotal(new BigDecimal("120.00"));
        agendamento.getServicos().add(linha("120.00"));
        var forma = new FormaPagamento();
        forma.setId(3L);
        when(agendamentos.findByIdAndEmpresaIdForUpdate(10L, 1L)).thenReturn(Optional.of(agendamento));
        when(formas.findByIdAndEmpresaIdAndAtivoTrue(3L, 1L)).thenReturn(Optional.of(forma));

        service.registrarPagamento(10L, 3L);
        service.registrarPagamento(10L, 3L);

        verify(receitas).save(org.mockito.ArgumentMatchers.any());
        assertEquals(Boolean.TRUE, agendamento.getPago());
    }

    private ServicoAgendamento linha(String preco) {
        var servico = new Servico();
        servico.setId(new BigDecimal(preco).longValue());
        servico.setNome("Serviço");
        servico.setPreco(new BigDecimal(preco));
        servico.setTempoEstimadoMinutos(60);
        var linha = new ServicoAgendamento();
        linha.setServico(servico);
        return linha;
    }
}
