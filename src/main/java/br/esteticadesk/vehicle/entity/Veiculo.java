package br.esteticadesk.vehicle.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.customer.entity.Cliente;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.sql.Types;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;

@Entity
@Table(name = "veiculo")
@Getter
@Setter
public class Veiculo extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 8)
    @Column(nullable = false)
    private String placa;
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String modelo;
    @NotBlank
    @Size(max = 60)
    @Column(nullable = false)
    private String marca;
    @Size(max = 30)
    private String cor;
    @Min(1950)
    @JdbcTypeCode(Types.SMALLINT)
    private Integer ano;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;
}
