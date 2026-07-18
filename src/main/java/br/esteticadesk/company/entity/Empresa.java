package br.esteticadesk.company.entity;

import br.esteticadesk.common.EntidadeBase;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.StatusAssinatura;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "empresa")
@Getter
@Setter
public class Empresa extends EntidadeBase {
    @NotBlank
    @Size(max = 150)
    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;
    @NotBlank
    @Size(max = 150)
    @Column(name = "nome_fantasia", nullable = false)
    private String nomeFantasia;
    @NotBlank
    @Size(max = 18)
    @Column(nullable = false, unique = true)
    private String cnpj;
    @Size(max = 20)
    private String telefone;
    @Email
    @Size(max = 150)
    private String email;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanoAssinatura plano = PlanoAssinatura.BASICO;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status_assinatura", nullable = false)
    private StatusAssinatura statusAssinatura = StatusAssinatura.ATIVA;

    @NotNull
    @DecimalMin("0")
    @Column(name = "valor_mensalidade", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorMensalidade = BigDecimal.ZERO;

    @NotNull
    @Column(name = "proximo_vencimento", nullable = false)
    private LocalDate proximoVencimento;

    @NotNull
    @Column(name = "bloqueio_manual", nullable = false)
    private Boolean bloqueioManual = false;

    @Size(max = 500)
    @Column(name = "motivo_bloqueio", length = 500)
    private String motivoBloqueio;

    @Column(name = "bloqueado_em")
    private LocalDateTime bloqueadoEm;
}
