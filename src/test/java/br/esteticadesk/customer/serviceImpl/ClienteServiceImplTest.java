package br.esteticadesk.customer.serviceImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.dto.ClienteDTO;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.mapper.ClienteMapper;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.exception.CpfJaCadastradoException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClienteServiceImplTest {
    @Mock
    private ClienteRepository repository;
    @Mock
    private ClienteMapper mapper;
    @Mock
    private SessaoUsuario sessao;

    private ClienteServiceImpl service;

    @BeforeEach
    void configurar() {
        service = new ClienteServiceImpl(repository, mapper, sessao);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
    }

    @Test
    void atualizaClienteExcluindoOProprioIdDaValidacaoDeCpf() {
        var cliente = clienteExistente();
        var dto = clienteDto();
        when(repository.findByIdAndEmpresaId(10L, 7L)).thenReturn(Optional.of(cliente));
        when(repository.existeCpfCnpjNormalizado(7L, "52998224725", 10L)).thenReturn(false);
        when(repository.save(cliente)).thenReturn(cliente);
        when(mapper.paraDto(cliente)).thenReturn(dto);

        service.atualizar(10L, dto);

        verify(repository).existeCpfCnpjNormalizado(7L, "52998224725", 10L);
        verify(mapper).atualizarEntidade(dto, cliente);
        verify(repository).save(cliente);
    }

    @Test
    void rejeitaCpfDeOutroClienteDaMesmaEmpresa() {
        var cliente = clienteExistente();
        var dto = clienteDto();
        when(repository.findByIdAndEmpresaId(10L, 7L)).thenReturn(Optional.of(cliente));
        when(repository.existeCpfCnpjNormalizado(7L, "52998224725", 10L)).thenReturn(true);

        assertThrows(CpfJaCadastradoException.class, () -> service.atualizar(10L, dto));

        verify(repository, never()).save(any());
    }

    @Test
    void reativaClienteDaEmpresaAtual() {
        var cliente = clienteExistente();
        cliente.setAtivo(false);
        var dto = clienteDto();
        when(repository.findByIdAndEmpresaId(10L, 7L)).thenReturn(Optional.of(cliente));
        when(repository.save(cliente)).thenReturn(cliente);
        when(mapper.paraDto(cliente)).thenReturn(dto);

        service.reativar(10L);

        assertTrue(cliente.getAtivo());
        verify(repository).save(cliente);
        verify(mapper).paraDto(cliente);
    }

    @Test
    void normalizaTelefoneCepEEmailAoSalvar() {
        var dto = clienteDto();
        var cliente = clienteExistente();
        cliente.setTelefone("(11) 99999-9999");
        cliente.setCep("01001-000");
        cliente.setEmail("  CLIENTE@EXEMPLO.COM ");
        when(mapper.paraEntidade(dto)).thenReturn(cliente);
        when(repository.save(cliente)).thenReturn(cliente);
        when(mapper.paraDto(cliente)).thenReturn(dto);

        service.salvar(dto);

        var captor = ArgumentCaptor.forClass(Cliente.class);
        verify(repository).save(captor.capture());
        assertEquals("11999999999", captor.getValue().getTelefone());
        assertEquals("01001000", captor.getValue().getCep());
        assertEquals("cliente@exemplo.com", captor.getValue().getEmail());
    }

    @Test
    void rejeitaTelefoneComQuantidadeInvalidaDeDigitos() {
        var cliente = clienteExistente();
        cliente.setTelefone("(11) 9999-999");
        when(mapper.paraEntidade(clienteDto())).thenReturn(cliente);

        var exception = assertThrows(IllegalArgumentException.class, () -> service.salvar(clienteDto()));

        assertEquals("Telefone deve conter 10 ou 11 dígitos.", exception.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void rejeitaCepComQuantidadeInvalidaDeDigitos() {
        var cliente = clienteExistente();
        cliente.setCep("0100-100");
        when(mapper.paraEntidade(clienteDto())).thenReturn(cliente);

        var exception = assertThrows(IllegalArgumentException.class, () -> service.salvar(clienteDto()));

        assertEquals("CEP deve conter 8 dígitos.", exception.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void buscaTelefoneMascaradoTambemPelosDigitos() {
        when(repository.buscar(7L, "(11) 99999-9999", "11999999999", Boolean.TRUE)).thenReturn(List.of());

        service.listar("(11) 99999-9999", true);

        verify(repository).buscar(7L, "(11) 99999-9999", "11999999999", Boolean.TRUE);
    }

    private Cliente clienteExistente() {
        var cliente = new Cliente();
        cliente.setId(10L);
        cliente.setEmpresaId(7L);
        cliente.setNome("Cliente");
        cliente.setTelefone("11999999999");
        cliente.setAtivo(true);
        return cliente;
    }

    private ClienteDTO clienteDto() {
        return new ClienteDTO(10L, "Cliente", "529.982.247-25", "11999999999", "cliente@exemplo.com",
                "01001-000", "Praça da Sé", "1", null, "Sé", "São Paulo", "sp", true);
    }
}
