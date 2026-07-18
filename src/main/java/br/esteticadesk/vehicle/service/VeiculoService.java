package br.esteticadesk.vehicle.service;

import br.esteticadesk.vehicle.entity.Veiculo;

public interface VeiculoService {
    Veiculo salvar(Veiculo veiculo, Long clienteId);
}
