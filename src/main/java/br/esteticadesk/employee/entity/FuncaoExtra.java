package br.esteticadesk.employee.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "funcao_extra")
@Getter
@Setter
public class FuncaoExtra extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String descricao;
    @NotNull
    @Positive
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;
    @NotNull
    @Column(name = "data_referencia", nullable = false)
    private LocalDate dataReferencia;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funcionario_id", nullable = false)
    private Funcionario funcionario;
}
