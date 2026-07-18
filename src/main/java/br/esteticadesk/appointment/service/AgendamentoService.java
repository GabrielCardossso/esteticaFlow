package br.esteticadesk.appointment.service;

import br.esteticadesk.appointment.dto.ItemConsumidoDTO;
import br.esteticadesk.appointment.entity.Agendamento;
import java.util.List;

public interface AgendamentoService {
    Agendamento criar(Agendamento agendamento);

    void iniciar(Long id);

    void finalizarServico(Long id, List<ItemConsumidoDTO> itens, Long formaPagamentoId);

    void cancelar(Long id);
}
