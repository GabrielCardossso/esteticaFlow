package br.esteticadesk.employee.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.enums.PapelUsuario;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "usuario")
@Getter
@Setter
public class Usuario extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String nome;
    @NotBlank
    @Email
    @Size(max = 150)
    @Column(nullable = false, unique = true)
    private String email;
    @NotBlank
    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PapelUsuario papel;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", insertable = false, updatable = false)
    private Empresa empresa;
}
