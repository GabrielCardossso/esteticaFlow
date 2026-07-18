package br.esteticadesk.dashboard.dto;

import java.math.BigDecimal;

public record DespesaPorCategoriaDTO(String categoria, BigDecimal valor) {
}
