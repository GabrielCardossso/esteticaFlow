package br.esteticadesk.enums;

public enum StatusAgendamento {
    AGENDADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO;

    /** Rótulo amigável para exibição (ex.: EM ANDAMENTO). */
    public String rotulo() {
        return name().replace('_', ' ');
    }
}

