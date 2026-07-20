package br.esteticadesk.auth.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "historico_acesso")
@Getter
@Setter
public class HistoricoAcesso extends EntidadeEmpresaBase {

    @NotNull
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @NotNull
    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @Size(max = 64)
    private String ip;

    @Size(max = 500)
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Size(max = 80)
    private String navegador;

    @Size(max = 80)
    @Column(name = "sistema_operacional", length = 80)
    private String sistemaOperacional;
}
