package br.esteticadesk.company.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAssinatura;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AssinaturaServiceTest {

    @Mock
    private EmpresaRepository empresas;
    @Mock
    private SessaoUsuario sessao;
    @Mock
    private LogService logs;

    private AssinaturaService service;

    @BeforeEach
    void configurar() {
        service = new AssinaturaService(empresas, sessao, logs);
    }

    @Test
    void respeitaMatrizDeRecursosELimites() {
        assertEquals(2, PlanoAssinatura.BASICO.getLimiteUsuarios());
        assertEquals(10, PlanoAssinatura.PRO.getLimiteUsuarios());
        assertEquals(50, PlanoAssinatura.EXCLUSIVE.getLimiteUsuarios());
        assertFalse(PlanoAssinatura.BASICO.permite(RecursoPlano.ESTOQUE));
        assertTrue(PlanoAssinatura.PRO.permite(RecursoPlano.ESTOQUE));
        assertFalse(PlanoAssinatura.PRO.permite(RecursoPlano.RELATORIO_DETALHADO));
        assertTrue(PlanoAssinatura.EXCLUSIVE.permite(RecursoPlano.RELATORIO_DETALHADO));
    }

    @Test
    void recalculaAtrasoSemBloqueioAutomaticoERespeitaTolerancia() {
        var hoje = LocalDate.of(2026, 7, 18);
        var empresa = empresa(PlanoAssinatura.BASICO, hoje.minusDays(7));

        assertEquals(StatusAssinatura.EM_ATRASO, service.recalcularSituacao(empresa, hoje));
        assertFalse(service.elegivelParaBloqueio(empresa, hoje));
        assertEquals(StatusAssinatura.EM_ATRASO, empresa.getStatusAssinatura());

        empresa.setProximoVencimento(hoje.minusDays(8));
        assertTrue(service.elegivelParaBloqueio(empresa, hoje));
        assertEquals(StatusAssinatura.EM_ATRASO, empresa.getStatusAssinatura());
    }

    @Test
    void somenteSuperAdminPodeAlterarAssinatura() {
        when(sessao.isSuperAdmin()).thenReturn(false);

        var exception = assertThrows(SecurityException.class,
                () -> service.atualizarPlano(1L, PlanoAssinatura.PRO, BigDecimal.TEN,
                        LocalDate.now().plusMonths(1)));

        assertEquals("Apenas o SUPER_ADMIN pode gerenciar planos e empresas.", exception.getMessage());
    }

    @Test
    void gateNegaBasicoELiberaProESuperAdmin() {
        var basico = empresa(PlanoAssinatura.BASICO, LocalDate.now().plusMonths(1));
        when(sessao.empresaObrigatoria()).thenReturn(1L);
        when(empresas.findById(1L)).thenReturn(Optional.of(basico));

        assertThrows(SecurityException.class, () -> service.exigirRecurso(RecursoPlano.FINANCEIRO));

        basico.setPlano(PlanoAssinatura.PRO);
        assertDoesNotThrow(() -> service.exigirRecurso(RecursoPlano.FINANCEIRO));

        basico.setPlano(PlanoAssinatura.BASICO);
        when(sessao.isSuperAdmin()).thenReturn(true);
        assertDoesNotThrow(() -> service.exigirRecurso(RecursoPlano.FINANCEIRO));
    }

    @Test
    void bloqueioPorAtrasoExigeMaisDeSeteDias() {
        when(sessao.isSuperAdmin()).thenReturn(true);
        var empresa = empresa(PlanoAssinatura.BASICO, LocalDate.now().minusDays(7));
        empresa.setId(1L);
        when(empresas.findById(1L)).thenReturn(Optional.of(empresa));

        assertThrows(IllegalStateException.class, () -> service.bloquear(1L, "Em atraso", false));

        empresa.setProximoVencimento(LocalDate.now().minusDays(8));
        service.bloquear(1L, "Em atraso", false);
        assertEquals(StatusAssinatura.BLOQUEADA, empresa.getStatusAssinatura());
        assertFalse(empresa.getBloqueioManual());
    }

    private Empresa empresa(PlanoAssinatura plano, LocalDate vencimento) {
        var empresa = new Empresa();
        empresa.setId(1L);
        empresa.setPlano(plano);
        empresa.setAtivo(true);
        empresa.setStatusAssinatura(StatusAssinatura.ATIVA);
        empresa.setValorMensalidade(BigDecimal.ZERO);
        empresa.setProximoVencimento(vencimento);
        empresa.setBloqueioManual(false);
        return empresa;
    }
}
