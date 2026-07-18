package br.esteticadesk.customer.mapper;

import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.entity.Cliente;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface ClienteMapper {
    ClienteDTO paraDto(Cliente cliente);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "empresaId", ignore = true)
    @Mapping(target = "dataCriacao", ignore = true)
    @Mapping(target = "dataAtualizacao", ignore = true)
    @Mapping(target = "veiculos", ignore = true)
    Cliente paraEntidade(ClienteDTO dto);
}
