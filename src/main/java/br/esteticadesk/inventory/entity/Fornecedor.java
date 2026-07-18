package br.esteticadesk.inventory.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "fornecedor")
@Getter
@Setter
public class Fornecedor extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String nome;
    @Size(max = 18)
    private String cnpj;
    @Size(max = 20)
    private String telefone;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
}
