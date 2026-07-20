package br.esteticadesk.notification.entity;

import br.esteticadesk.common.EntidadeBase;
import br.esteticadesk.enums.TipoNotificacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "notificacao")
@Getter
@Setter
public class Notificacao extends EntidadeBase {

    @Column(name = "empresa_id")
    private Long empresaId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoNotificacao tipo;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String titulo;

    @NotBlank
    @Size(max = 1000)
    @Column(nullable = false, length = 1000)
    private String mensagem;

    @NotNull
    @Column(nullable = false)
    private Boolean lida = false;

    @Size(max = 40)
    @Column(name = "referencia_tipo", length = 40)
    private String referenciaTipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Size(max = 255)
    @Column(name = "acao_url", length = 255)
    private String acaoUrl;
}
