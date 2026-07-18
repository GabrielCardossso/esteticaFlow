package br.esteticadesk.backup.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.enums.TipoBackup;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "backup")
@Getter
@Setter
public class Backup extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 500)
    @Column(name = "caminho_arquivo", nullable = false)
    private String caminhoArquivo;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoBackup tipo;
    @NotNull
    @Column(name = "data_execucao", nullable = false)
    private LocalDateTime dataExecucao;

    @PrePersist
    void preencherData() {
        if (dataExecucao == null)
            dataExecucao = LocalDateTime.now();
    }
}
