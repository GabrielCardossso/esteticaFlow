package br.esteticadesk.enums;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public enum PlanoAssinatura {
    BASICO(2, RecursoPlano.DASHBOARD, RecursoPlano.CLIENTES, RecursoPlano.SERVICOS,
            RecursoPlano.AGENDA, RecursoPlano.RELATORIO_SIMPLES, RecursoPlano.PDF),
    PRO(10, RecursoPlano.DASHBOARD, RecursoPlano.CLIENTES, RecursoPlano.SERVICOS,
            RecursoPlano.AGENDA, RecursoPlano.RELATORIO_SIMPLES, RecursoPlano.PDF,
            RecursoPlano.ESTOQUE, RecursoPlano.FINANCEIRO, RecursoPlano.EXCEL,
            RecursoPlano.PERSONALIZACAO_TEMA),
    EXCLUSIVE(50, RecursoPlano.DASHBOARD, RecursoPlano.CLIENTES, RecursoPlano.SERVICOS,
            RecursoPlano.AGENDA, RecursoPlano.RELATORIO_SIMPLES, RecursoPlano.PDF,
            RecursoPlano.ESTOQUE, RecursoPlano.FINANCEIRO, RecursoPlano.EXCEL,
            RecursoPlano.PERSONALIZACAO_TEMA, RecursoPlano.RELATORIO_DETALHADO);

    private final int limiteUsuarios;
    private final Set<RecursoPlano> recursos;

    PlanoAssinatura(int limiteUsuarios, RecursoPlano primeiro, RecursoPlano... demais) {
        this.limiteUsuarios = limiteUsuarios;
        var catalogo = EnumSet.of(primeiro, demais);
        this.recursos = Collections.unmodifiableSet(catalogo);
    }

    public int getLimiteUsuarios() {
        return limiteUsuarios;
    }

    public Set<RecursoPlano> getRecursos() {
        return recursos;
    }

    public boolean permite(RecursoPlano recurso) {
        return recursos.contains(recurso);
    }
}
