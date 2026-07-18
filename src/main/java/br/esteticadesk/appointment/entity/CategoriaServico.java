package br.esteticadesk.appointment.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "categoria_servico")
@Getter
@Setter
public class CategoriaServico extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String nome;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
}
