package br.esteticadesk.finance.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.enums.CategoriaDespesa;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(name = "despesa")
@Getter
@Setter
public class Despesa extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String descricao;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategoriaDespesa categoria;
    @NotNull
    @Positive
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;
    @NotNull
    @Column(name = "data_pagamento", nullable = false)
    private LocalDate dataPagamento;
}
