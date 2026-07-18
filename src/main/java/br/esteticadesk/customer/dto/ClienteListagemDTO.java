package br.esteticadesk.customer.dto;

public record ClienteListagemDTO(Long id, String nome, String telefone, String cpfCnpj, int veiculos,
        boolean ativo) {
}
