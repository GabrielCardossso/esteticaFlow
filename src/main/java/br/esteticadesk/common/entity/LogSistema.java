package br.esteticadesk.common.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.employee.entity.Usuario;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.sql.Types;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;

@Entity
@Table(name = "log")
@Getter
@Setter
public class LogSistema extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String acao;
    @JdbcTypeCode(Types.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String detalhes;
    @NotNull
    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @PrePersist
    void preencherData() {
        if (dataHora == null)
            dataHora = LocalDateTime.now();
    }
}
