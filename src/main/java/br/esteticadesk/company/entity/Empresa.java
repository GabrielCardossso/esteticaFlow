package br.esteticadesk.company.entity;

import br.esteticadesk.common.EntidadeBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "empresa")
@Getter
@Setter
public class Empresa extends EntidadeBase {
    @NotBlank
    @Size(max = 150)
    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;
    @NotBlank
    @Size(max = 150)
    @Column(name = "nome_fantasia", nullable = false)
    private String nomeFantasia;
    @NotBlank
    @Size(max = 18)
    @Column(nullable = false, unique = true)
    private String cnpj;
    @Size(max = 20)
    private String telefone;
    @Email
    @Size(max = 150)
    private String email;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
}
