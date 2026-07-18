package br.esteticadesk.vehicle.service;

import br.esteticadesk.vehicle.entity.Veiculo;
import java.util.List;

public interface VeiculoService {
    Veiculo salvar(Veiculo veiculo, Long clienteId);

    Veiculo buscarPorId(Long id, Long clienteId);

    List<Veiculo> listarPorCliente(Long clienteId);

    Veiculo inativar(Long id, Long clienteId);
}
