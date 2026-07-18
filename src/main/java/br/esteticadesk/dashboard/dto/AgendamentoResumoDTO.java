package br.esteticadesk.dashboard.dto;

import java.time.LocalDateTime;

public record AgendamentoResumoDTO(Long id, LocalDateTime dataHora, String cliente, String veiculo, String servico,
        String status) {
}
