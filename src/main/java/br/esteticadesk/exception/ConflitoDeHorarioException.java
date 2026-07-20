package br.esteticadesk.exception;

/** Conflito duro: funcionário já ocupado no horário. */
public class ConflitoDeHorarioException extends RuntimeException {
    public ConflitoDeHorarioException() {
        super("Este funcionário já possui um atendimento neste horário. Escolha outro horário ou outro responsável.");
    }

    public ConflitoDeHorarioException(String mensagem) {
        super(mensagem);
    }
}
