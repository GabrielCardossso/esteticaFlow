package br.esteticadesk.exception;

public class ConflitoDeHorarioException extends RuntimeException {
    public ConflitoDeHorarioException() {
        super("O funcionário já possui agendamento neste horário.");
    }
}
