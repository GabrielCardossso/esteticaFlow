package br.esteticadesk.exception;

public class TransicaoDeStatusInvalidaException extends RuntimeException {
    public TransicaoDeStatusInvalidaException() {
        super("Transição de status do agendamento não permitida.");
    }
}
