package br.esteticadesk.appointment.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.employee.entity.Funcionario;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.vehicle.entity.Veiculo;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.*;

@Entity
@Table(name = "agendamento")
@Getter
@Setter
public class Agendamento extends EntidadeEmpresaBase {
    @NotNull
    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusAgendamento status = StatusAgendamento.AGENDADO;
    @Size(max = 500)
    private String observacoes;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id", nullable = false)
    private Servico servico;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funcionario_id")
    private Funcionario funcionario;
    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemServico> itensServico = new ArrayList<>();
}
