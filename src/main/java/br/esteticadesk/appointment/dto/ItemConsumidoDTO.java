package br.esteticadesk.appointment.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.*;

public record ItemConsumidoDTO(@NotNull Long produtoId, @NotNull @Positive BigDecimal quantidade) {
}
