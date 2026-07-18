package br.esteticadesk.employee.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "funcionario")
@Getter
@Setter
public class Funcionario extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 14)
    @Column(nullable = false)
    private String cpf;
    @NotNull
    @PastOrPresent
    @Column(name = "data_admissao", nullable = false)
    private LocalDate dataAdmissao;
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Column(name = "comissao_percentual", precision = 5, scale = 2)
    private BigDecimal comissaoPercentual;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;
}
