package br.esteticadesk.common;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@MappedSuperclass
@Getter
@Setter
public abstract class EntidadeBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime dataCriacao;
    private LocalDateTime dataAtualizacao;

    @PrePersist
    protected void aoPersistir() {
        var agora = LocalDateTime.now();
        dataCriacao = agora;
        dataAtualizacao = agora;
    }

    @PreUpdate
    protected void aoAtualizar() {
        dataAtualizacao = LocalDateTime.now();
    }
}
