package br.esteticadesk.company.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "configuracao")
@Getter
@Setter
public class Configuracao extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String chave;
    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String valor;
}
