package br.esteticadesk.finance.entity;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(name = "receita")
@Getter
@Setter
public class Receita extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String descricao;
    @NotNull
    @Positive
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;
    @NotNull
    @Column(name = "data_recebimento", nullable = false)
    private LocalDate dataRecebimento;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forma_pagamento_id", nullable = false)
    private FormaPagamento formaPagamento;
}
