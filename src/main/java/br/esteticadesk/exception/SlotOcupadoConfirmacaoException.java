package br.esteticadesk.exception;

/**
 * Há outro atendimento no mesmo período, mas sem funcionário fixo.
 * A criação só segue se o usuário confirmar explicitamente.
 */
public class SlotOcupadoConfirmacaoException extends RuntimeException {
    public SlotOcupadoConfirmacaoException() {
        super("Já existe outro atendimento neste horário. Confirme se deseja criar mesmo assim.");
    }
}
