package br.esteticadesk.exception;

public class CpfJaCadastradoException extends RuntimeException {
    public CpfJaCadastradoException() {
        super("CPF/CNPJ já cadastrado para esta empresa.");
    }
}
