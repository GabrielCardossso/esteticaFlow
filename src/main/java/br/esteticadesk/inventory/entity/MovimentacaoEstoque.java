package br.esteticadesk.inventory.entity;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.enums.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "movimentacao_estoque")
@Getter
@Setter
public class MovimentacaoEstoque extends EntidadeEmpresaBase {
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimentacao tipo;
    @NotNull
    @Positive
    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal quantidade;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrigemMovimentacao origem;
    @NotNull
    @Column(name = "data_movimentacao", nullable = false)
    private LocalDateTime dataMovimentacao;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @PrePersist
    void preencherData() {
        if (dataMovimentacao == null)
            dataMovimentacao = LocalDateTime.now();
    }
}
