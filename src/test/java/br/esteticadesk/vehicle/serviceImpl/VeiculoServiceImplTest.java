package br.esteticadesk.vehicle.serviceImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.exception.PlacaJaCadastradaException;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VeiculoServiceImplTest {
    @Mock
    private VeiculoRepository veiculos;
    @Mock
    private ClienteRepository clientes;
    @Mock
    private SessaoUsuario sessao;

    private VeiculoServiceImpl service;

    @BeforeEach
    void configurar() {
        service = new VeiculoServiceImpl(veiculos, clientes, sessao);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
    }

    @Test
    void atualizaVeiculoExcluindoOProprioIdDaValidacaoDePlaca() {
        var cliente = clienteAtivo();
        var existente = veiculoExistente(cliente);
        var alteracoes = new Veiculo();
        alteracoes.setId(20L);
        alteracoes.setPlaca("abc-1234");
        alteracoes.setMarca("Ford");
        alteracoes.setModelo("Ka");
        alteracoes.setCor("Prata");
        alteracoes.setAno(2020);

        when(veiculos.existePlacaNormalizada(7L, "ABC1234", 20L)).thenReturn(false);
        when(clientes.findByIdAndEmpresaId(10L, 7L)).thenReturn(Optional.of(cliente));
        when(veiculos.findByIdAndEmpresaId(20L, 7L)).thenReturn(Optional.of(existente));
        when(veiculos.save(existente)).thenReturn(existente);

        var salvo = service.salvar(alteracoes, 10L);

        assertEquals("ABC1234", salvo.getPlaca());
        assertEquals("Ka", salvo.getModelo());
        verify(veiculos).existePlacaNormalizada(7L, "ABC1234", 20L);
        verify(veiculos).save(existente);
    }

    @Test
    void rejeitaPlacaDeOutroVeiculoDaMesmaEmpresa() {
        var alteracoes = new Veiculo();
        alteracoes.setId(20L);
        alteracoes.setPlaca("ABC1D23");
        when(veiculos.existePlacaNormalizada(7L, "ABC1D23", 20L)).thenReturn(true);

        assertThrows(PlacaJaCadastradaException.class, () -> service.salvar(alteracoes, 10L));

        verify(veiculos, never()).save(any());
    }

    private Cliente clienteAtivo() {
        var cliente = new Cliente();
        cliente.setId(10L);
        cliente.setEmpresaId(7L);
        cliente.setAtivo(true);
        return cliente;
    }

    private Veiculo veiculoExistente(Cliente cliente) {
        var veiculo = new Veiculo();
        veiculo.setId(20L);
        veiculo.setEmpresaId(7L);
        veiculo.setCliente(cliente);
        veiculo.setPlaca("ABC1234");
        veiculo.setMarca("Ford");
        veiculo.setModelo("Fiesta");
        veiculo.setAtivo(true);
        return veiculo;
    }
}
