package br.esteticadesk.company.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.entity.SolicitacaoAlteracaoEmpresa;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.repository.SolicitacaoAlteracaoEmpresaRepository;
import br.esteticadesk.enums.StatusSolicitacao;
import br.esteticadesk.enums.TipoNotificacao;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.notification.service.NotificacaoService;
import br.esteticadesk.validation.DocumentoValidator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SolicitacaoAlteracaoEmpresaService {

    private final SolicitacaoAlteracaoEmpresaRepository solicitacoes;
    private final EmpresaRepository empresas;
    private final SessaoUsuario sessao;
    private final NotificacaoService notificacoes;
    private final LogService logs;

    public SolicitacaoAlteracaoEmpresaService(SolicitacaoAlteracaoEmpresaRepository solicitacoes,
            EmpresaRepository empresas, SessaoUsuario sessao, NotificacaoService notificacoes, LogService logs) {
        this.solicitacoes = solicitacoes;
        this.empresas = empresas;
        this.sessao = sessao;
        this.notificacoes = notificacoes;
        this.logs = logs;
    }

    public SolicitacaoAlteracaoEmpresa solicitar(String razaoSocial, String nomeFantasia, String cnpj,
            String telefone, String email) {
        if (!sessao.isAdministradorEmpresa()) {
            throw new SecurityException("Apenas o administrador da empresa pode solicitar alteração dos dados.");
        }
        var empresaId = sessao.empresaObrigatoria();
        if (solicitacoes.findByEmpresaIdAndStatus(empresaId, StatusSolicitacao.PENDENTE).isPresent()) {
            throw new IllegalStateException(
                    "Já existe uma solicitação pendente. Aguarde a análise da EsteticaFlow.");
        }

        var razao = textoObrigatorio(razaoSocial, "Razão social", 150);
        var fantasia = textoObrigatorio(nomeFantasia, "Nome fantasia", 150);
        var cnpjNormalizado = validarCnpj(cnpj, empresaId);
        var tel = validarTelefone(telefone);
        var mail = validarEmail(email);

        var empresa = empresas.findById(empresaId).orElseThrow();
        var sol = new SolicitacaoAlteracaoEmpresa();
        sol.setEmpresaId(empresaId);
        sol.setRazaoSocial(razao);
        sol.setNomeFantasia(fantasia);
        sol.setCnpj(cnpjNormalizado);
        sol.setTelefone(tel);
        sol.setEmail(mail);
        sol.setStatus(StatusSolicitacao.PENDENTE);
        sol.setSolicitadoPor(sessao.getUsuarioId());
        sol = solicitacoes.save(sol);

        var detalhes = descreverPedido(empresa, sol);
        notificacoes.notificarSuperAdmin(TipoNotificacao.SOLICITACAO_EMPRESA,
                "Solicitação de alteração: " + empresa.getNomeFantasia(),
                "A empresa pediu alteração dos dados cadastrais.\n\n" + detalhes,
                "SOLICITACAO", sol.getId(), "/notificacoes");
        notificacoes.notificarEmpresa(empresaId, TipoNotificacao.SOLICITACAO_DECISAO,
                "Solicitação enviada à EsteticaFlow",
                "Sua solicitação de alteração dos dados da empresa está aguardando aprovação.\n\n" + detalhes,
                "SOLICITACAO_ENVIO", sol.getId(), "/configuracoes");

        logs.registrar(empresaId, sessao.getUsuarioLogado(), "SOLICITACAO_EMPRESA_CRIADA",
                "Solicitação " + sol.getId());
        return sol;
    }

    public void aprovar(Long id) {
        exigirSuperAdmin();
        var sol = buscarPendente(id);
        var empresa = empresas.findById(sol.getEmpresaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa não encontrada."));

        if (empresas.existeCnpjNormalizado(sol.getCnpj(), empresa.getId())) {
            throw new IllegalArgumentException("CNPJ já cadastrado em outra empresa.");
        }

        var detalhes = descreverPedido(empresa, sol);

        empresa.setRazaoSocial(sol.getRazaoSocial());
        empresa.setNomeFantasia(sol.getNomeFantasia());
        empresa.setCnpj(sol.getCnpj());
        empresa.setTelefone(sol.getTelefone());
        empresa.setEmail(sol.getEmail());
        empresas.save(empresa);

        sol.setStatus(StatusSolicitacao.APROVADA);
        sol.setDecididoPor(sessao.getUsuarioId());
        sol.setDataDecisao(HorarioSistema.agora());
        solicitacoes.save(sol);

        notificacoes.marcarLidasPorReferencia(empresa.getId(), TipoNotificacao.SOLICITACAO_DECISAO,
                "SOLICITACAO_ENVIO", sol.getId());
        notificacoes.notificarEmpresaNova(empresa.getId(), TipoNotificacao.SOLICITACAO_DECISAO,
                "Alteração de empresa aprovada",
                "A EsteticaFlow aprovou a alteração dos dados cadastrais da empresa.\n\n"
                        + "Dados aplicados:\n" + detalhes,
                "SOLICITACAO_DECISAO", sol.getId(), "/notificacoes");
        logs.registrar(empresa.getId(), sessao.getUsuarioLogado(), "SOLICITACAO_EMPRESA_APROVADA",
                "Solicitação " + sol.getId());
    }

    public void rejeitar(Long id, String motivo) {
        exigirSuperAdmin();
        var sol = buscarPendente(id);
        var empresa = empresas.findById(sol.getEmpresaId()).orElse(null);
        var motivoNormalizado = motivo == null || motivo.isBlank()
                ? "Solicitação rejeitada pela EsteticaFlow."
                : motivo.trim();
        if (motivoNormalizado.length() > 500) {
            throw new IllegalArgumentException("Motivo deve ter no máximo 500 caracteres.");
        }
        sol.setStatus(StatusSolicitacao.REJEITADA);
        sol.setMotivo(motivoNormalizado);
        sol.setDecididoPor(sessao.getUsuarioId());
        sol.setDataDecisao(HorarioSistema.agora());
        solicitacoes.save(sol);

        var detalhes = empresa == null
                ? descreverDadosSolicitados(sol)
                : descreverPedido(empresa, sol);

        notificacoes.marcarLidasPorReferencia(sol.getEmpresaId(), TipoNotificacao.SOLICITACAO_DECISAO,
                "SOLICITACAO_ENVIO", sol.getId());
        notificacoes.notificarEmpresaNova(sol.getEmpresaId(), TipoNotificacao.SOLICITACAO_DECISAO,
                "Alteração de empresa rejeitada",
                "A EsteticaFlow rejeitou a alteração dos dados cadastrais da empresa.\n\n"
                        + "Motivo: " + motivoNormalizado + "\n\n"
                        + "Dados que haviam sido solicitados:\n" + detalhes,
                "SOLICITACAO_DECISAO", sol.getId(), "/notificacoes");
        logs.registrar(sol.getEmpresaId(), sessao.getUsuarioLogado(), "SOLICITACAO_EMPRESA_REJEITADA",
                "Solicitação " + sol.getId());
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoAlteracaoEmpresa> listarPendentes() {
        exigirSuperAdmin();
        return solicitacoes.findByStatusOrderByDataCriacaoDesc(StatusSolicitacao.PENDENTE);
    }

    @Transactional(readOnly = true)
    public SolicitacaoAlteracaoEmpresa pendenteDaEmpresaAtual() {
        if (sessao.getEmpresaId() == null) {
            return null;
        }
        return solicitacoes.findByEmpresaIdAndStatus(sessao.empresaObrigatoria(), StatusSolicitacao.PENDENTE)
                .orElse(null);
    }

    public String descreverPedido(Empresa atual, SolicitacaoAlteracaoEmpresa sol) {
        var linhas = new ArrayList<String>();
        linhas.add(linhaAlteracao("Razão social", atual.getRazaoSocial(), sol.getRazaoSocial()));
        linhas.add(linhaAlteracao("Nome fantasia", atual.getNomeFantasia(), sol.getNomeFantasia()));
        linhas.add(linhaAlteracao("CNPJ", formatarCnpj(atual.getCnpj()), formatarCnpj(sol.getCnpj())));
        linhas.add(linhaAlteracao("Telefone", formatarTelefone(atual.getTelefone()),
                formatarTelefone(sol.getTelefone())));
        linhas.add(linhaAlteracao("E-mail", textoOuVazio(atual.getEmail()), textoOuVazio(sol.getEmail())));
        return String.join("\n", linhas);
    }

    public String descreverDadosSolicitados(SolicitacaoAlteracaoEmpresa sol) {
        return String.join("\n",
                "• Razão social: " + sol.getRazaoSocial(),
                "• Nome fantasia: " + sol.getNomeFantasia(),
                "• CNPJ: " + formatarCnpj(sol.getCnpj()),
                "• Telefone: " + formatarTelefone(sol.getTelefone()),
                "• E-mail: " + textoOuVazio(sol.getEmail()));
    }

    private String linhaAlteracao(String campo, String atual, String proposto) {
        var de = textoOuVazio(atual);
        var para = textoOuVazio(proposto);
        if (Objects.equals(normalizarComparacao(de), normalizarComparacao(para))) {
            return "• " + campo + ": " + para + " (sem alteração)";
        }
        return "• " + campo + ": " + de + " → " + para;
    }

    private String normalizarComparacao(String valor) {
        return valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
    }

    private String textoOuVazio(String valor) {
        return valor == null || valor.isBlank() ? "(vazio)" : valor.trim();
    }

    private String formatarCnpj(String cnpj) {
        var digitos = somenteDigitos(cnpj);
        if (digitos.length() != 14) {
            return textoOuVazio(cnpj);
        }
        return digitos.substring(0, 2) + "." + digitos.substring(2, 5) + "." + digitos.substring(5, 8)
                + "/" + digitos.substring(8, 12) + "-" + digitos.substring(12);
    }

    private String formatarTelefone(String telefone) {
        var digitos = somenteDigitos(telefone);
        if (digitos.length() == 11) {
            return "(" + digitos.substring(0, 2) + ") " + digitos.substring(2, 7) + "-" + digitos.substring(7);
        }
        if (digitos.length() == 10) {
            return "(" + digitos.substring(0, 2) + ") " + digitos.substring(2, 6) + "-" + digitos.substring(6);
        }
        return textoOuVazio(telefone);
    }

    private SolicitacaoAlteracaoEmpresa buscarPendente(Long id) {
        var sol = solicitacoes.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação não encontrada."));
        if (sol.getStatus() != StatusSolicitacao.PENDENTE) {
            throw new IllegalStateException("Esta solicitação já foi decidida.");
        }
        return sol;
    }

    private void exigirSuperAdmin() {
        if (!sessao.isSuperAdmin()) {
            throw new SecurityException("Apenas o Super Admin da EsteticaFlow pode decidir solicitações.");
        }
    }

    private String validarCnpj(String valor, Long idAtual) {
        if (!DocumentoValidator.cnpjValido(valor)) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        var cnpj = somenteDigitos(valor);
        if (empresas.existeCnpjNormalizado(cnpj, idAtual)) {
            throw new IllegalArgumentException("CNPJ já cadastrado.");
        }
        return cnpj;
    }

    private String validarTelefone(String valor) {
        var telefone = somenteDigitos(valor);
        if (telefone.isEmpty()) {
            return null;
        }
        if (telefone.length() != 10 && telefone.length() != 11) {
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 dígitos.");
        }
        return telefone;
    }

    private String validarEmail(String valor) {
        var email = valor == null || valor.isBlank() ? null : valor.trim().toLowerCase(Locale.ROOT);
        if (email == null) {
            return null;
        }
        if (email.length() > 150 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("E-mail inválido.");
        }
        return email;
    }

    private String textoObrigatorio(String valor, String campo, int limite) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }
        var texto = valor.trim();
        if (texto.length() > limite) {
            throw new IllegalArgumentException(campo + " deve ter no máximo " + limite + " caracteres.");
        }
        return texto;
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
