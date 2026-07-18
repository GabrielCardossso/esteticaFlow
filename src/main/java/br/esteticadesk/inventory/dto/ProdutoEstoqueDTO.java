package br.esteticadesk.inventory.dto;

import br.esteticadesk.enums.UnidadeMedida;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProdutoEstoqueDTO(Long id, @NotBlank @Size(max = 150) String nome,
        @NotNull UnidadeMedida unidadeMedida, @NotNull @PositiveOrZero BigDecimal precoCusto,
        @NotNull Long categoriaProdutoId, @NotNull @PositiveOrZero BigDecimal quantidadeInicial,
        @NotNull @PositiveOrZero BigDecimal quantidadeMinima) {
}
