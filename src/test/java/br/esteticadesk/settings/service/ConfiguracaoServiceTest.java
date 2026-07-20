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
import br.esteticadesk.employee.entity.Usuario;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.enums.PlanoAssinatura;
import java.time.LocalDate;
import java.util.Optional;
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

        assertEquals("Limite de 2 usuários ativos atingido para o plano BASICO. Faça upgrade do plano para adicionar mais usuários.", exception.getMessage());
        verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void nuncaPermiteCriarSuperAdminPelaEmpresa() {
        when(sessao.isAdministradorEmpresa()).thenReturn(true);

        var exception = assertThrows(SecurityException.class,
                () -> service.criarUsuario("Root", "root@empresa.com", "123456", PapelUsuario.SUPER_ADMIN));

        assertEquals("SUPER_ADMIN não pode ser criado na gestão da empresa.", exception.getMessage());
    }

    @Test
    void reaplicaLimiteDoPlanoAoReativarUsuario() {
        var empresa = new Empresa();
        empresa.setId(7L);
        empresa.setPlano(PlanoAssinatura.BASICO);
        var usuario = usuario(PapelUsuario.FUNCIONARIO, false);
        when(sessao.isAdministradorEmpresa()).thenReturn(true);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(usuarios.findByIdAndEmpresaId(12L, 7L)).thenReturn(Optional.of(usuario));
        when(assinaturas.empresaAtual()).thenReturn(empresa);
        when(usuarios.countByEmpresaIdAndAtivoTrueAndPapelNot(7L, PapelUsuario.SUPER_ADMIN)).thenReturn(2L);

        var exception = assertThrows(IllegalStateException.class, () -> service.reativarUsuario(12L));

        assertEquals("Limite de 2 usuários ativos atingido para o plano BASICO. Faça upgrade do plano para adicionar mais usuários.", exception.getMessage());
        verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void nuncaPermiteGerenciarSuperAdminPeloTenant() {
        when(sessao.isAdministradorEmpresa()).thenReturn(true);
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        when(usuarios.findByIdAndEmpresaId(12L, 7L))
                .thenReturn(Optional.of(usuario(PapelUsuario.SUPER_ADMIN, false)));

        var exception = assertThrows(SecurityException.class, () -> service.reativarUsuario(12L));

        assertEquals("SUPER_ADMIN não pode ser gerenciado pela empresa.", exception.getMessage());
        verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejeitaCnpjInvalidoAoCriarEmpresa() {
        when(sessao.isSuperAdmin()).thenReturn(true);

        var exception = assertThrows(IllegalArgumentException.class,
                () -> service.criarEmpresa("Empresa", "Fantasia", "11.111.111/1111-11", null, null,
                        "Administrador", "admin@empresa.com", "123456", PlanoAssinatura.BASICO,
                        java.math.BigDecimal.ZERO, LocalDate.now().plusMonths(1)));

        assertEquals("CNPJ inválido.", exception.getMessage());
        verify(empresas, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejeitaCnpjDuplicadoMesmoQuandoLegadoEstaMascarado() {
        when(sessao.isSuperAdmin()).thenReturn(true);
        when(empresas.existeCnpjNormalizado("11222333000181", null)).thenReturn(true);

        var exception = assertThrows(IllegalArgumentException.class,
                () -> service.criarEmpresa("Empresa", "Fantasia", "11.222.333/0001-81", null, null,
                        "Administrador", "admin@empresa.com", "123456", PlanoAssinatura.BASICO,
                        java.math.BigDecimal.ZERO, LocalDate.now().plusMonths(1)));

        assertEquals("CNPJ já cadastrado.", exception.getMessage());
        verify(empresas).existeCnpjNormalizado("11222333000181", null);
        verify(empresas, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void aplicaPrecoPadraoDoPlanoQuandoMensalidadeNaoFoiInformada() {
        when(sessao.isSuperAdmin()).thenReturn(true);
        when(empresas.existeCnpjNormalizado("11222333000181", null)).thenReturn(false);
        when(empresas.save(org.mockito.ArgumentMatchers.any(Empresa.class))).thenAnswer(invocation -> {
            var empresa = invocation.getArgument(0, Empresa.class);
            empresa.setId(7L);
            return empresa;
        });
        when(configuracoes.findByEmpresaIdAndChave(7L, ConfiguracaoService.TEMA_COR))
                .thenReturn(Optional.empty());

        var empresa = service.criarEmpresa("Empresa", "Fantasia", "11.222.333/0001-81", null, null,
                "Administrador", "admin@empresa.com", "123456", PlanoAssinatura.COMPLETO,
                null, LocalDate.now().plusMonths(1));

        assertEquals(new java.math.BigDecimal("119.90"), empresa.getValorMensalidade());
    }

    @Test
    void normalizaDadosDaEmpresaSemAlterarPlanoDoTenant() {
        var atual = new Empresa();
        atual.setId(7L);
        atual.setPlano(PlanoAssinatura.COMPLETO);
        var dados = new Empresa();
        dados.setRazaoSocial("  Empresa LTDA  ");
        dados.setNomeFantasia("  Empresa  ");
        dados.setCnpj("11.222.333/0001-81");
        dados.setTelefone("(11) 99999-9999");
        dados.setEmail("  CONTATO@EMPRESA.COM ");
        dados.setPlano(PlanoAssinatura.BASICO);
        when(assinaturas.empresaAtual()).thenReturn(atual);
        when(sessao.isSuperAdmin()).thenReturn(true);
        when(sessao.isAdministrador()).thenReturn(true);
        when(empresas.existeCnpjNormalizado("11222333000181", 7L)).thenReturn(false);
        when(empresas.save(atual)).thenReturn(atual);

        service.salvarEmpresa(dados);

        assertEquals("Empresa LTDA", atual.getRazaoSocial());
        assertEquals("Empresa", atual.getNomeFantasia());
        assertEquals("11222333000181", atual.getCnpj());
        assertEquals("11999999999", atual.getTelefone());
        assertEquals("contato@empresa.com", atual.getEmail());
        assertEquals(PlanoAssinatura.COMPLETO, atual.getPlano());
    }

    private Usuario usuario(PapelUsuario papel, boolean ativo) {
        var usuario = new Usuario();
        usuario.setPapel(papel);
        usuario.setAtivo(ativo);
        return usuario;
    }
}
