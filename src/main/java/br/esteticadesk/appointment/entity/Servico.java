package br.esteticadesk.appointment.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "servico")
@Getter
@Setter
public class Servico extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String nome;
    @Size(max = 500)
    private String descricao;
    @NotNull
    @Positive
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;
    @NotNull
    @Positive
    @Column(name = "tempo_estimado_minutos", nullable = false)
    private Integer tempoEstimadoMinutos;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_servico_id", nullable = false)
    private CategoriaServico categoriaServico;
}
