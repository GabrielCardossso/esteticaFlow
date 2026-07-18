package br.esteticadesk.inventory.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "estoque")
@Getter
@Setter
public class Estoque extends EntidadeEmpresaBase {
    @NotNull
    @PositiveOrZero
    @Column(name = "quantidade_atual", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantidadeAtual = BigDecimal.ZERO;
    @NotNull
    @PositiveOrZero
    @Column(name = "quantidade_minima", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantidadeMinima = BigDecimal.ZERO;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false, unique = true)
    private Produto produto;
}
