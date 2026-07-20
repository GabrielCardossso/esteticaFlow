package br.esteticadesk.inventory.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.enums.UnidadeMedida;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "produto")
@Getter
@Setter
public class Produto extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String nome;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "unidade_medida", nullable = false)
    private UnidadeMedida unidadeMedida;
    @NotNull
    @PositiveOrZero
    @Column(name = "preco_custo", nullable = false, precision = 12, scale = 4)
    private BigDecimal precoCusto;

    /** Quantidade contida em uma embalagem (ex.: 2000 ml). */
    @NotNull
    @Positive
    @Column(name = "quantidade_embalagem", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidadeEmbalagem = BigDecimal.ONE;

    /** Valor pago pela embalagem inteira (não pela unidade). */
    @NotNull
    @PositiveOrZero
    @Column(name = "valor_embalagem", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorEmbalagem = BigDecimal.ZERO;

    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_produto_id", nullable = false)
    private CategoriaProduto categoriaProduto;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;
}
