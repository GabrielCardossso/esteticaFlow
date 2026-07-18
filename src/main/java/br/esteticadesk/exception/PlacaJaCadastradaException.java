package br.esteticadesk.exception;

public class PlacaJaCadastradaException extends RuntimeException {
    public PlacaJaCadastradaException() {
        super("Placa já cadastrada para esta empresa.");
    }
}
