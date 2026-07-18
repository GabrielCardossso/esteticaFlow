package br.esteticadesk.settings.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.repository.ConfiguracaoRepository;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.employee.repository.UsuarioRepository;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.enums.PlanoAssinatura;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class ConfiguracaoServiceTest {

    @Mock
    private SessaoUsuario sessao;
    @Mock
    private EmpresaRepository empresas;
    @Mock
    private ConfiguracaoRepository configuracoes;
    @Mock
    private UsuarioRepository usuarios;
    @Mock
    private FormaPagamentoRepository formas;
    @Mock
    private CategoriaProdutoRepository categorias;
    @Mock
    private PasswordEncoder encoder;
    @Mock
    private AssinaturaService assinaturas;
    @Mock
    private LogService logs;

    private ConfiguracaoService service;

    @BeforeEach
    void configurar() {
        service = new ConfiguracaoService(sessao, empresas, configuracoes, usuarios, formas, categorias, encoder,
                assinaturas, logs);
        lenient().when(sessao.isAdministrador()).thenReturn(true);
    }

    @Test
    void rejeitaNomeDeCategoriaVazio() {
        var exception = assertThrows(IllegalArgumentException.class, () -> service.criarCategoria("   "));

        assertEquals("Nome da categoria é obrigatório.", exception.getMessage());
        verify(categorias, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejeitaCategoriaDuplicadaIgnorandoMaiusculasEMinusculas() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(categorias.existsByEmpresaIdAndNomeIgnoreCase(7L, "Químicos")).thenReturn(true);

        var exception = assertThrows(IllegalArgumentException.class,
                () -> service.criarCategoria("  Químicos  "));

        assertEquals("Já existe uma categoria de produto com este nome.", exception.getMessage());
        verify(categorias, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void criaCategoriaComNomeNormalizado() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(categorias.existsByEmpresaIdAndNomeIgnoreCase(7L, "Químicos")).thenReturn(false);
        when(categorias.save(org.mockito.ArgumentMatchers.any(CategoriaProduto.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.criarCategoria("  Químicos  ");

        var captor = ArgumentCaptor.forClass(CategoriaProduto.class);
        verify(categorias).save(captor.capture());
        assertEquals(7L, captor.getValue().getEmpresaId());
        assertEquals("Químicos", captor.getValue().getNome());
        assertEquals(true, captor.getValue().getAtivo());
    }

    @Test
    void rejeitaNovoUsuarioQuandoLimiteDoPlanoFoiAtingido() {
        var empresa = new Empresa();
        empresa.setId(7L);
        empresa.setPlano(PlanoAssinatura.BASICO);
        empresa.setProximoVencimento(LocalDate.now().plusMonths(1));
        when(sessao.isAdministradorEmpresa()).thenReturn(true);
        when(assinaturas.empresaAtual()).thenReturn(empresa);
        when(usuarios.countByEmpresaIdAndAtivoTrueAndPapelNot(7L, PapelUsuario.SUPER_ADMIN)).thenReturn(2L);

        var exception = assertThrows(IllegalStateException.class,
                () -> service.criarUsuario("Novo", "novo@empresa.com", "123456", PapelUsuario.FUNCIONARIO));

        assertEquals("Limite de 2 usuários ativos atingido para o plano BASICO.", exception.getMessage());
        verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void nuncaPermiteCriarSuperAdminPelaEmpresa() {
        when(sessao.isAdministradorEmpresa()).thenReturn(true);

        var exception = assertThrows(SecurityException.class,
                () -> service.criarUsuario("Root", "root@empresa.com", "123456", PapelUsuario.SUPER_ADMIN));

        assertEquals("SUPER_ADMIN não pode ser criado na gestão da empresa.", exception.getMessage());
    }
}
