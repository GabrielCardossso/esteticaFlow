package br.esteticadesk.company.entity;

import br.esteticadesk.common.EntidadeBase;
import br.esteticadesk.enums.StatusSolicitacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "solicitacao_alteracao_empresa")
@Getter
@Setter
public class SolicitacaoAlteracaoEmpresa extends EntidadeBase {

    @NotNull
    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @NotBlank
    @Size(max = 150)
    @Column(name = "razao_social", nullable = false, length = 150)
    private String razaoSocial;

    @NotBlank
    @Size(max = 150)
    @Column(name = "nome_fantasia", nullable = false, length = 150)
    private String nomeFantasia;

    @NotBlank
    @Size(max = 18)
    @Column(nullable = false, length = 18)
    private String cnpj;

    @Size(max = 20)
    private String telefone;

    @Size(max = 150)
    private String email;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusSolicitacao status = StatusSolicitacao.PENDENTE;

    @NotNull
    @Column(name = "solicitado_por", nullable = false)
    private Long solicitadoPor;

    @Column(name = "decidido_por")
    private Long decididoPor;

    @Size(max = 500)
    @Column(length = 500)
    private String motivo;

    @Column(name = "data_decisao")
    private LocalDateTime dataDecisao;
}
