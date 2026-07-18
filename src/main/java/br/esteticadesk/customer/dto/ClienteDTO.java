package br.esteticadesk.customer.dto;

import jakarta.validation.constraints.*;

public record ClienteDTO(Long id, @NotBlank @Size(max = 150) String nome, @Size(max = 18) String cpfCnpj,
        @NotBlank @Size(max = 20) String telefone, @Email @Size(max = 150) String email, Boolean ativo) {
}
