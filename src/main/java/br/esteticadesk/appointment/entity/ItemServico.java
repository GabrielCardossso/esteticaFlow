package br.esteticadesk.appointment.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.inventory.entity.Produto;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "item_servico")
@Getter
@Setter
public class ItemServico extends EntidadeEmpresaBase {
    @NotNull
    @Positive
    @Column(name = "quantidade_consumida", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantidadeConsumida;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;
}
