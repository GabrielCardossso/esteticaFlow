package br.esteticadesk.appointment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.esteticadesk.appointment.entity.CategoriaServico;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.repository.CategoriaServicoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServicoServiceTest {

    @Mock
    private ServicoRepository servicos;
    @Mock
    private CategoriaServicoRepository categorias;
    @Mock
    private SessaoUsuario sessao;

    private ServicoService service;

    @BeforeEach
    void configurar() {
        service = new ServicoService(servicos, categorias, sessao);
    }

    @Test
    void criaCategoriaNormalizadaNaEmpresaDaSessao() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);

        service.criarCategoria("  Polimento  ");

        var captor = ArgumentCaptor.forClass(CategoriaServico.class);
        verify(categorias).save(captor.capture());
        assertEquals(7L, captor.getValue().getEmpresaId());
        assertEquals("Polimento", captor.getValue().getNome());
        assertEquals(true, captor.getValue().getAtivo());
    }

    @Test
    void rejeitaCategoriaDuplicadaIgnorandoMaiusculas() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(categorias.existsByEmpresaIdAndNomeIgnoreCase(7L, "Lavagem")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.criarCategoria("Lavagem"));

        verify(categorias, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void reativaServicoSomenteNaEmpresaDaSessao() {
        var servico = new Servico();
        servico.setAtivo(false);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(servicos.findByIdAndEmpresaId(3L, 7L)).thenReturn(Optional.of(servico));

        service.reativar(3L);

        assertEquals(true, servico.getAtivo());
        verify(servicos).findByIdAndEmpresaId(3L, 7L);
    }
}
