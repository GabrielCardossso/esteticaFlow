package br.esteticadesk.customer.service;

import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.dto.ClienteListagemDTO;
import java.util.List;

public interface ClienteService {
    ClienteDTO salvar(ClienteDTO cliente);

    ClienteDTO inativar(Long id);

    List<ClienteListagemDTO> listar(String busca, Boolean ativo);
}
