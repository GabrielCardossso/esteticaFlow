package br.esteticadesk.appointment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ServicoDTO(
        Long id,
        @NotBlank @Size(max = 150) String nome,
        @Size(max = 500) String descricao,
        @NotNull @Positive BigDecimal preco,
        @NotNull @Positive Integer tempoEstimadoMinutos,
        @NotNull Long categoriaServicoId,
        boolean ativo) {
}
