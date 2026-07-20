package br.esteticadesk.inventory.dto;

import br.esteticadesk.enums.UnidadeMedida;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Cadastro de produto com preço da embalagem inteira.
 * O custo unitário é calculado: valorEmbalagem / quantidadeEmbalagem.
 */
public record ProdutoEstoqueDTO(Long id, @NotBlank @Size(max = 150) String nome,
        @NotNull UnidadeMedida unidadeMedida,
        @NotNull @Positive BigDecimal quantidadeEmbalagem,
        @NotNull @PositiveOrZero BigDecimal valorEmbalagem,
        @NotNull Long categoriaProdutoId,
        @NotNull @PositiveOrZero BigDecimal quantidadeInicial,
        @NotNull @PositiveOrZero BigDecimal quantidadeMinima) {

    /** Custo por unidade de medida (ex.: por ml). */
    public BigDecimal custoUnitario() {
        if (quantidadeEmbalagem == null || quantidadeEmbalagem.signum() <= 0 || valorEmbalagem == null) {
            return BigDecimal.ZERO;
        }
        return valorEmbalagem.divide(quantidadeEmbalagem, 4, java.math.RoundingMode.HALF_UP);
    }
}
