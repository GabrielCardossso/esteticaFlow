package br.esteticadesk.exception;

public class EstoqueInsuficienteException extends RuntimeException {
    public EstoqueInsuficienteException(String produto) {
        super("Produto " + produto + " sem estoque suficiente.");
    }
}
