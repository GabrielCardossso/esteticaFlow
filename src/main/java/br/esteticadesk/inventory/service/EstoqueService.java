package br.esteticadesk.inventory.service;

import java.math.BigDecimal;

public interface EstoqueService {
    void registrarEntrada(Long produtoId, BigDecimal quantidade);
}
