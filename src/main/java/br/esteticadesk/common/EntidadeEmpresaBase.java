package br.esteticadesk.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/** Base para todos os dados pertencentes a uma empresa. */
@MappedSuperclass
@Getter
@Setter
public abstract class EntidadeEmpresaBase extends EntidadeBase {
    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;
}
