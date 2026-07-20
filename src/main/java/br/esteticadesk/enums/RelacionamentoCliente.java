package br.esteticadesk.enums;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public enum RelacionamentoCliente {
    ATIVO("Cliente ativo", "ate 30 dias"),
    EM_RISCO("Cliente em risco", "30 a 90 dias"),
    INATIVO("Cliente inativo", "mais de 90 dias"),
    SEM_ATENDIMENTO("Sem atendimentos", "ainda nao retornou");

    private final String rotulo;
    private final String descricao;

    RelacionamentoCliente(String rotulo, String descricao) {
        this.rotulo = rotulo;
        this.descricao = descricao;
    }

    public String rotulo() {
        return rotulo;
    }

    public String descricao() {
        return descricao;
    }

    public static RelacionamentoCliente de(LocalDateTime ultimoAtendimento, LocalDateTime referencia) {
        if (ultimoAtendimento == null) {
            return SEM_ATENDIMENTO;
        }
        var dias = ChronoUnit.DAYS.between(ultimoAtendimento.toLocalDate(), referencia.toLocalDate());
        if (dias <= 30) {
            return ATIVO;
        }
        if (dias <= 90) {
            return EM_RISCO;
        }
        return INATIVO;
    }
}
