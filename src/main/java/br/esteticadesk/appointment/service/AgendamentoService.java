package br.esteticadesk.appointment.service;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.Agendamento;
import java.util.List;

public interface AgendamentoService {
    Agendamento criar(Agendamento agendamento, boolean confirmarSlotOcupado);

    void iniciar(Long id);

    /** Marca pagamento sem alterar o status do atendimento. */
    void marcarPago(Long id, Long formaPagamentoId);

    void concluir(Long id, List<ItemConsumidoDTO> itens, Long formaPagamentoIdSePendente);

    void registrarPagamento(Long id, Long formaPagamentoId);

    void cancelar(Long id);

    Agendamento buscarDetalhe(Long id);
}
