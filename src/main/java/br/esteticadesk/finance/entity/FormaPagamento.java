package br.esteticadesk.finance.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "forma_pagamento")
@Getter
@Setter
public class FormaPagamento extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String nome;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
}
