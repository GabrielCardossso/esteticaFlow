package br.esteticadesk.company.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.StatusAssinatura;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AssinaturaService {

    public static final int DIAS_TOLERANCIA = 7;

    private final EmpresaRepository empresas;
    private final SessaoUsuario sessao;
    private final LogService logs;

    public AssinaturaService(EmpresaRepository empresas, SessaoUsuario sessao, LogService logs) {
        this.empresas = empresas;
        this.sessao = sessao;
        this.logs = logs;
    }

    @Transactional(readOnly = true)
    public Empresa buscar(Long empresaId) {
        return empresas.findById(empresaId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada."));
    }

    public Empresa empresaAtual() {
        var empresa = buscar(sessao.empresaObrigatoria());
        recalcularSituacao(empresa, LocalDate.now());
        return empresa;
    }

    public StatusAssinatura recalcularSituacao(Empresa empresa, LocalDate hoje) {
        if (!Boolean.TRUE.equals(empresa.getAtivo())
                || empresa.getStatusAssinatura() == StatusAssinatura.CANCELADA
                || empresa.getStatusAssinatura() == StatusAssinatura.BLOQUEADA) {
            return empresa.getStatusAssinatura();
        }
        var status = empresa.getProximoVencimento().isBefore(hoje)
                ? StatusAssinatura.EM_ATRASO
                : StatusAssinatura.ATIVA;
        if (empresa.getStatusAssinatura() != status) {
            empresa.setStatusAssinatura(status);
            if (empresa.getId() != null) {
                empresas.save(empresa);
            }
        }
        return status;
    }

    public long diasEmAtraso(Empresa empresa, LocalDate hoje) {
        if (!empresa.getProximoVencimento().isBefore(hoje)) {
            return 0;
        }
        return ChronoUnit.DAYS.between(empresa.getProximoVencimento(), hoje);
    }

    public boolean elegivelParaBloqueio(Empresa empresa, LocalDate hoje) {
        return diasEmAtraso(empresa, hoje) > DIAS_TOLERANCIA;
    }

    @Transactional(readOnly = true)
    public boolean empresaPodeAcessar(Empresa empresa) {
        return Boolean.TRUE.equals(empresa.getAtivo())
                && empresa.getStatusAssinatura() != StatusAssinatura.BLOQUEADA
                && empresa.getStatusAssinatura() != StatusAssinatura.CANCELADA;
    }

    public boolean permite(RecursoPlano recurso) {
        if (sessao.isSuperAdmin()) {
            return true;
        }
        return empresaAtual().getPlano().permite(recurso);
    }

    public Set<RecursoPlano> recursosAtuais() {
        if (sessao.isSuperAdmin()) {
            return EnumSet.allOf(RecursoPlano.class);
        }
        return empresaAtual().getPlano().getRecursos();
    }

    public void exigirRecurso(RecursoPlano recurso) {
        if (!permite(recurso)) {
            throw new SecurityException("O recurso " + nomeRecurso(recurso)
                    + " exige o plano Completo.");
        }
    }

    public Empresa atualizarPlano(Long empresaId, PlanoAssinatura plano, BigDecimal valorMensalidade,
            LocalDate proximoVencimento) {
        exigirSuperAdmin();
        if (plano == null || valorMensalidade == null || valorMensalidade.signum() < 0
                || proximoVencimento == null) {
            throw new IllegalArgumentException("Plano, valor não negativo e vencimento são obrigatórios.");
        }
        var empresa = buscar(empresaId);
        empresa.setPlano(plano);
        empresa.setValorMensalidade(valorMensalidade);
        empresa.setProximoVencimento(proximoVencimento);
        recalcularSituacao(empresa, LocalDate.now());
        registrar(empresa, "ASSINATURA_ATUALIZADA",
                "Plano=" + plano + ", valor=" + valorMensalidade + ", vencimento=" + proximoVencimento);
        return empresa;
    }

    public Empresa registrarPagamento(Long empresaId) {
        exigirSuperAdmin();
        var empresa = buscar(empresaId);
        var hoje = LocalDate.now();
        var base = empresa.getProximoVencimento().isAfter(hoje) ? empresa.getProximoVencimento() : hoje;
        empresa.setProximoVencimento(base.plusMonths(1));
        if (empresa.getStatusAssinatura() != StatusAssinatura.BLOQUEADA
                && empresa.getStatusAssinatura() != StatusAssinatura.CANCELADA) {
            empresa.setStatusAssinatura(StatusAssinatura.ATIVA);
        }
        registrar(empresa, "PAGAMENTO_ASSINATURA_REGISTRADO",
                "Novo vencimento=" + empresa.getProximoVencimento());
        return empresa;
    }

    public Empresa bloquear(Long empresaId, String motivo, boolean manual) {
        exigirSuperAdmin();
        var empresa = buscar(empresaId);
        var motivoNormalizado = textoObrigatorio(motivo, "Informe o motivo do bloqueio.");
        if (!manual && !elegivelParaBloqueio(empresa, LocalDate.now())) {
            throw new IllegalStateException("A empresa ainda está dentro da tolerância de 7 dias.");
        }
        empresa.setStatusAssinatura(StatusAssinatura.BLOQUEADA);
        empresa.setBloqueioManual(manual);
        empresa.setMotivoBloqueio(motivoNormalizado);
        empresa.setBloqueadoEm(LocalDateTime.now());
        registrar(empresa, "EMPRESA_BLOQUEADA", motivoNormalizado);
        return empresa;
    }

    public Empresa desbloquear(Long empresaId) {
        exigirSuperAdmin();
        var empresa = buscar(empresaId);
        if (!Boolean.TRUE.equals(empresa.getAtivo())
                || empresa.getStatusAssinatura() == StatusAssinatura.CANCELADA) {
            throw new IllegalStateException("Reative a empresa antes de desbloquear a assinatura.");
        }
        empresa.setBloqueioManual(false);
        empresa.setMotivoBloqueio(null);
        empresa.setBloqueadoEm(null);
        empresa.setStatusAssinatura(empresa.getProximoVencimento().isBefore(LocalDate.now())
                ? StatusAssinatura.EM_ATRASO
                : StatusAssinatura.ATIVA);
        registrar(empresa, "EMPRESA_DESBLOQUEADA", null);
        return empresa;
    }

    public Empresa inativar(Long empresaId) {
        exigirSuperAdmin();
        var empresa = buscar(empresaId);
        empresa.setAtivo(false);
        empresa.setStatusAssinatura(StatusAssinatura.CANCELADA);
        registrar(empresa, "EMPRESA_INATIVADA", null);
        return empresa;
    }

    public Empresa reativar(Long empresaId) {
        exigirSuperAdmin();
        var empresa = buscar(empresaId);
        empresa.setAtivo(true);
        empresa.setBloqueioManual(false);
        empresa.setMotivoBloqueio(null);
        empresa.setBloqueadoEm(null);
        empresa.setStatusAssinatura(empresa.getProximoVencimento().isBefore(LocalDate.now())
                ? StatusAssinatura.EM_ATRASO
                : StatusAssinatura.ATIVA);
        registrar(empresa, "EMPRESA_REATIVADA", null);
        return empresa;
    }

    private void exigirSuperAdmin() {
        if (!sessao.isSuperAdmin()) {
            throw new SecurityException("Apenas o SUPER_ADMIN pode gerenciar planos e empresas.");
        }
    }

    private void registrar(Empresa empresa, String acao, String detalhes) {
        logs.registrar(empresa.getId(), sessao.getUsuarioLogado(), acao, detalhes);
    }

    private String textoObrigatorio(String texto, String mensagem) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException(mensagem);
        }
        return texto.trim();
    }

    private String nomeRecurso(RecursoPlano recurso) {
        return recurso.name().toLowerCase().replace('_', ' ');
    }
}
