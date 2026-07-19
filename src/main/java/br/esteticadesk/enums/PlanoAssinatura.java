package br.esteticadesk.enums;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public enum PlanoAssinatura {
    BASICO(2, new BigDecimal("59.90"), RecursoPlano.DASHBOARD, RecursoPlano.CLIENTES,
            RecursoPlano.SERVICOS,
            RecursoPlano.AGENDA, RecursoPlano.RELATORIO_SIMPLES, RecursoPlano.PDF),
    COMPLETO(50, new BigDecimal("119.90"), RecursoPlano.DASHBOARD, RecursoPlano.CLIENTES,
            RecursoPlano.SERVICOS,
            RecursoPlano.AGENDA, RecursoPlano.RELATORIO_SIMPLES, RecursoPlano.PDF,
            RecursoPlano.ESTOQUE, RecursoPlano.FINANCEIRO, RecursoPlano.EXCEL,
            RecursoPlano.PERSONALIZACAO_TEMA, RecursoPlano.RELATORIO_DETALHADO);

    private final int limiteUsuarios;
    private final BigDecimal valorMensalPadrao;
    private final Set<RecursoPlano> recursos;

    PlanoAssinatura(int limiteUsuarios, BigDecimal valorMensalPadrao, RecursoPlano primeiro,
            RecursoPlano... demais) {
        this.limiteUsuarios = limiteUsuarios;
        this.valorMensalPadrao = valorMensalPadrao;
        var catalogo = EnumSet.of(primeiro, demais);
        this.recursos = Collections.unmodifiableSet(catalogo);
    }

    public int getLimiteUsuarios() {
        return limiteUsuarios;
    }

    public BigDecimal getValorMensalPadrao() {
        return valorMensalPadrao;
    }

    public Set<RecursoPlano> getRecursos() {
        return recursos;
    }

    public boolean permite(RecursoPlano recurso) {
        return recursos.contains(recurso);
    }
}
