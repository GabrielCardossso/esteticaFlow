package br.esteticadesk.customer.dto;

import jakarta.validation.constraints.*;

public record ClienteDTO(Long id, @NotBlank @Size(max = 150) String nome, @Size(max = 18) String cpfCnpj,
        @NotBlank @Size(max = 20) String telefone, @Email @Size(max = 150) String email,
        @Pattern(regexp = "^$|^\\d{5}-?\\d{3}$", message = "CEP inválido.") @Size(max = 9) String cep,
        @Size(max = 150) String logradouro, @Size(max = 20) String numero,
        @Size(max = 100) String complemento, @Size(max = 100) String bairro,
        @Size(max = 100) String cidade,
        @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "UF deve conter 2 letras.") @Size(max = 2) String uf,
        Boolean ativo) {
}
