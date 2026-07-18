package br.esteticadesk.dashboard.dto;

import java.math.BigDecimal;

public record AlertaEstoqueDTO(Long produtoId, String produto, BigDecimal atual, BigDecimal minimo) {
}
