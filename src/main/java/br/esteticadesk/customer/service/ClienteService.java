package br.esteticadesk.customer.service;

import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.dto.ClienteListagemDTO;
import java.util.List;

public interface ClienteService {
    ClienteDTO salvar(ClienteDTO cliente);

    ClienteDTO atualizar(Long id, ClienteDTO cliente);

    ClienteDTO buscarPorId(Long id);

    ClienteDTO inativar(Long id);

    ClienteDTO reativar(Long id);

    List<ClienteListagemDTO> listar(String busca, Boolean ativo);
}
