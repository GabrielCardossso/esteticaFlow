package br.esteticadesk.appointment.service;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.Agendamento;
import java.util.List;

public interface AgendamentoService {
    Agendamento criar(Agendamento agendamento);

    void iniciar(Long id);

    void concluir(Long id, List<ItemConsumidoDTO> itens, boolean pago, Long formaPagamentoId);

    void registrarPagamento(Long id, Long formaPagamentoId);

    void cancelar(Long id);
}
