package br.esteticadesk.inventory.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "categoria_produto")
@Getter
@Setter
public class CategoriaProduto extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String nome;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
}
