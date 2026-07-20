package br.esteticadesk.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Relógio oficial do sistema (America/Sao_Paulo), alinhado ao Hibernate.
 */
public final class HorarioSistema {

    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private HorarioSistema() {
    }

    public static LocalDateTime agora() {
        return LocalDateTime.now(ZONE);
    }

    /** Agora truncado ao minuto, para comparar com inputs datetime-local. */
    public static LocalDateTime agoraNoMinuto() {
        return agora().withSecond(0).withNano(0);
    }

    public static LocalDate hoje() {
        return LocalDate.now(ZONE);
    }

    public static LocalDateTime inicioDoDia(LocalDate data) {
        return data.atStartOfDay();
    }

    public static LocalDateTime fimDoDia(LocalDate data) {
        return data.atTime(LocalTime.MAX);
    }
}
