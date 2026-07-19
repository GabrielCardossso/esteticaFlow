package br.esteticadesk.settings.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Configuracao;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.ConfiguracaoRepository;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.common.service.LogService;
import br.esteticadesk.employee.entity.Usuario;
import br.esteticadesk.employee.repository.UsuarioRepository;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.enums.PlanoAssinatura;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.validation.DocumentoValidator;
import java.math.BigDecimal;
import java.time.LocalDate;
import br.esteticadesk.finance.entity.FormaPagamento;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ConfiguracaoService {

    public static final String TEMA_COR = "tema.cor";
    private static final Set<String> CORES = Set.of("teal", "verde", "azul", "roxo", "laranja", "vermelho",
            "rosa", "dourado", "grafite");

    private final SessaoUsuario sessao;
    private final EmpresaRepository empresas;
    private final ConfiguracaoRepository configuracoes;
    private final UsuarioRepository usuarios;
    private final FormaPagamentoRepository formas;
    private final CategoriaProdutoRepository categorias;
    private final PasswordEncoder encoder;
    private final AssinaturaService assinaturas;
    private final LogService logs;

    public ConfiguracaoService(SessaoUsuario sessao, EmpresaRepository empresas, ConfiguracaoRepository configuracoes,
            UsuarioRepository usuarios, FormaPagamentoRepository formas, CategoriaProdutoRepository categorias,
            PasswordEncoder encoder, AssinaturaService assinaturas, LogService logs) {
        this.sessao = sessao;
        this.empresas = empresas;
        this.configuracoes = configuracoes;
        this.usuarios = usuarios;
        this.formas = formas;
        this.categorias = categorias;
        this.encoder = encoder;
        this.assinaturas = assinaturas;
        this.logs = logs;
    }

    public Empresa empresaAtual() {
        return assinaturas.empresaAtual();
    }

    public Empresa salvarEmpresa(Empresa dados) {
        exigirAdmin();
        var atual = empresaAtual();
        var razaoSocial = textoObrigatorio(dados.getRazaoSocial(), "Razão social", 150);
        var nomeFantasia = textoObrigatorio(dados.getNomeFantasia(), "Nome fantasia", 150);
        var cnpj = validarCnpj(dados.getCnpj(), atual.getId());
        var telefone = validarTelefone(dados.getTelefone());
        var email = validarEmail(dados.getEmail(), "E-mail da empresa", false);
        atual.setRazaoSocial(razaoSocial);
        atual.setNomeFantasia(nomeFantasia);
        atual.setCnpj(cnpj);
        atual.setTelefone(telefone);
        atual.setEmail(email);
        return empresas.save(atual);
    }

    public List<Usuario> usuarios(boolean mostrarTodos) {
        exigirAdmin();
        var empresaId = sessao.empresaObrigatoria();
        return mostrarTodos ? usuarios.findByEmpresaIdOrderByNome(empresaId)
                : usuarios.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId);
    }

    public Usuario criarUsuario(String nome, String email, String senha, PapelUsuario papel) {
        exigirAdministradorEmpresa();
        var nomeNormalizado = textoObrigatorio(nome, "Nome do usuário", 150);
        var emailNormalizado = validarEmail(email, "E-mail do usuário", true);
        if (papel == PapelUsuario.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN não pode ser criado na gestão da empresa.");
        }
        if (papel == null) {
            papel = PapelUsuario.FUNCIONARIO;
        }
        if (usuarios.findByEmail(emailNormalizado).isPresent()) {
            throw new IllegalArgumentException("E-mail já cadastrado.");
        }
        if (senha == null || senha.length() < 6) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 6 caracteres.");
        }
        var empresa = assinaturas.empresaAtual();
        var quantidadeAtiva = usuarios.countByEmpresaIdAndAtivoTrueAndPapelNot(empresa.getId(),
                PapelUsuario.SUPER_ADMIN);
        if (quantidadeAtiva >= empresa.getPlano().getLimiteUsuarios()) {
            throw new IllegalStateException("Limite de " + empresa.getPlano().getLimiteUsuarios()
                    + " usuários ativos atingido para o plano " + empresa.getPlano() + ".");
        }
        var u = new Usuario();
        u.setEmpresaId(sessao.empresaObrigatoria());
        u.setNome(nomeNormalizado);
        u.setEmail(emailNormalizado);
        u.setSenhaHash(encoder.encode(senha));
        u.setPapel(papel);
        u.setAtivo(true);
        return usuarios.save(u);
    }

    public void inativarUsuario(Long id) {
        exigirAdministradorEmpresa();
        var usuario = buscarUsuarioGerenciavel(id);
        usuario.setAtivo(false);
        usuarios.save(usuario);
    }

    public void reativarUsuario(Long id) {
        exigirAdministradorEmpresa();
        var usuario = buscarUsuarioGerenciavel(id);
        if (Boolean.TRUE.equals(usuario.getAtivo())) {
            return;
        }
        var empresa = assinaturas.empresaAtual();
        var quantidadeAtiva = usuarios.countByEmpresaIdAndAtivoTrueAndPapelNot(empresa.getId(),
                PapelUsuario.SUPER_ADMIN);
        if (quantidadeAtiva >= empresa.getPlano().getLimiteUsuarios()) {
            throw new IllegalStateException("Limite de " + empresa.getPlano().getLimiteUsuarios()
                    + " usuários ativos atingido para o plano " + empresa.getPlano() + ".");
        }
        usuario.setAtivo(true);
        usuarios.save(usuario);
    }

    public List<FormaPagamento> formasPagamento(boolean mostrarTodas) {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var empresaId = sessao.empresaObrigatoria();
        return mostrarTodas ? formas.findByEmpresaIdOrderByAtivoDescNomeAsc(empresaId)
                : formas.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId);
    }

    public FormaPagamento criarFormaPagamento(String nome) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var nomeNormalizado = textoObrigatorio(nome, "Nome da forma de pagamento", 50);
        var f = new FormaPagamento();
        f.setEmpresaId(sessao.empresaObrigatoria());
        f.setNome(nomeNormalizado);
        f.setAtivo(true);
        return formas.save(f);
    }

    public void inativarFormaPagamento(Long id) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        buscarFormaPagamento(id).setAtivo(false);
    }

    public void reativarFormaPagamento(Long id) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        buscarFormaPagamento(id).setAtivo(true);
    }

    public List<CategoriaProduto> categorias(boolean mostrarTodas) {
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        var empresaId = sessao.empresaObrigatoria();
        return mostrarTodas ? categorias.findByEmpresaIdOrderByAtivoDescNomeAsc(empresaId)
                : categorias.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId);
    }

    public CategoriaProduto criarCategoria(String nome) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        var nomeNormalizado = textoObrigatorio(nome, "Nome da categoria", 100);
        var empresaId = sessao.empresaObrigatoria();
        if (categorias.existsByEmpresaIdAndNomeIgnoreCase(empresaId, nomeNormalizado)) {
            throw new IllegalArgumentException("Já existe uma categoria de produto com este nome.");
        }
        var c = new CategoriaProduto();
        c.setEmpresaId(empresaId);
        c.setNome(nomeNormalizado);
        c.setAtivo(true);
        return categorias.save(c);
    }

    public void inativarCategoria(Long id) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        buscarCategoria(id).setAtivo(false);
    }

    public void reativarCategoria(Long id) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        buscarCategoria(id).setAtivo(true);
    }

    public String temaCor() {
        return parametroTexto(TEMA_COR, "teal");
    }

    public void salvarTema(String cor) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.PERSONALIZACAO_TEMA);
        var corNormalizada = cor == null ? "teal" : cor.trim().toLowerCase();
        if (!CORES.contains(corNormalizada)) {
            throw new IllegalArgumentException("Cor de tema inválida.");
        }
        salvarParametroTexto(TEMA_COR, corNormalizada);
    }

    public List<Empresa> listarEmpresas(boolean mostrarTodas) {
        exigirSuperAdmin();
        return mostrarTodas ? empresas.findAllByOrderByNomeFantasiaAsc()
                : empresas.findByAtivoTrueOrderByNomeFantasiaAsc();
    }

    public Empresa criarEmpresa(String razaoSocial, String nomeFantasia, String cnpj, String telefone, String email,
            String adminNome, String adminEmail, String adminSenha, PlanoAssinatura plano,
            BigDecimal valorMensalidade, LocalDate proximoVencimento) {
        exigirSuperAdmin();
        var razaoSocialNormalizada = textoObrigatorio(razaoSocial, "Razão social", 150);
        var nomeFantasiaNormalizado = textoObrigatorio(nomeFantasia, "Nome fantasia", 150);
        var cnpjNormalizado = validarCnpj(cnpj, null);
        var telefoneNormalizado = validarTelefone(telefone);
        var emailNormalizado = validarEmail(email, "E-mail da empresa", false);
        var adminNomeNormalizado = textoObrigatorio(adminNome, "Nome do administrador", 150);
        var adminEmailNormalizado = validarEmail(adminEmail, "E-mail do administrador", true);
        if (plano == null || proximoVencimento == null
                || (valorMensalidade != null && valorMensalidade.signum() < 0)) {
            throw new IllegalArgumentException("Plano, vencimento e, quando informado, valor não negativo são obrigatórios.");
        }
        if (usuarios.findByEmail(adminEmailNormalizado).isPresent()) {
            throw new IllegalArgumentException("E-mail do administrador já cadastrado.");
        }
        if (adminSenha == null || adminSenha.length() < 6) {
            throw new IllegalArgumentException("A senha do administrador deve ter pelo menos 6 caracteres.");
        }

        var empresa = new Empresa();
        empresa.setRazaoSocial(razaoSocialNormalizada);
        empresa.setNomeFantasia(nomeFantasiaNormalizado);
        empresa.setCnpj(cnpjNormalizado);
        empresa.setTelefone(telefoneNormalizado);
        empresa.setEmail(emailNormalizado);
        empresa.setAtivo(true);
        empresa.setPlano(plano);
        empresa.setValorMensalidade(valorMensalidade == null ? plano.getValorMensalPadrao() : valorMensalidade);
        empresa.setProximoVencimento(proximoVencimento);
        empresa = empresas.save(empresa);

        var admin = new Usuario();
        admin.setEmpresaId(empresa.getId());
        admin.setNome(adminNomeNormalizado);
        admin.setEmail(adminEmailNormalizado);
        admin.setSenhaHash(encoder.encode(adminSenha));
        admin.setPapel(PapelUsuario.ADMINISTRADOR);
        admin.setAtivo(true);
        usuarios.save(admin);

        salvarParametroTextoEmpresa(empresa.getId(), TEMA_COR, "teal");
        logs.registrar(empresa.getId(), sessao.getUsuarioLogado(), "EMPRESA_CRIADA",
                "Plano=" + plano + ", vencimento=" + proximoVencimento);
        return empresa;
    }

    public boolean parametro(String chave, boolean padrao) {
        return configuracoes.findByEmpresaIdAndChave(sessao.empresaObrigatoria(), chave)
                .map(c -> Boolean.parseBoolean(c.getValor())).orElse(padrao);
    }

    public void salvarParametro(String chave, boolean valor) {
        salvarParametroTexto(chave, Boolean.toString(valor));
    }

    public String parametroTexto(String chave, String padrao) {
        return configuracoes.findByEmpresaIdAndChave(sessao.empresaObrigatoria(), chave)
                .map(Configuracao::getValor).orElse(padrao);
    }

    public void salvarParametroTexto(String chave, String valor) {
        salvarParametroTextoEmpresa(sessao.empresaObrigatoria(), chave, valor);
    }

    private void salvarParametroTextoEmpresa(Long empresaId, String chave, String valor) {
        var c = configuracoes.findByEmpresaIdAndChave(empresaId, chave).orElseGet(Configuracao::new);
        c.setEmpresaId(empresaId);
        c.setChave(chave);
        c.setValor(valor);
        configuracoes.save(c);
    }

    private Usuario buscarUsuarioGerenciavel(Long id) {
        var usuario = usuarios.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (usuario.getPapel() == PapelUsuario.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN não pode ser gerenciado pela empresa.");
        }
        return usuario;
    }

    private FormaPagamento buscarFormaPagamento(Long id) {
        return formas.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Forma de pagamento não encontrada."));
    }

    private CategoriaProduto buscarCategoria(Long id) {
        return categorias.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria de produto não encontrada."));
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
        var telefone = somenteDigitosOpcional(valor);
        if (telefone != null && telefone.length() != 10 && telefone.length() != 11) {
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 dígitos.");
        }
        return telefone;
    }

    private String validarEmail(String valor, String campo, boolean obrigatorio) {
        var email = valor == null || valor.isBlank() ? null : valor.trim().toLowerCase(Locale.ROOT);
        if (email == null) {
            if (obrigatorio) {
                throw new IllegalArgumentException(campo + " é obrigatório.");
            }
            return null;
        }
        if (email.length() > 150) {
            throw new IllegalArgumentException(campo + " deve ter no máximo 150 caracteres.");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException(campo + " inválido.");
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

    private String somenteDigitosOpcional(String valor) {
        var digitos = somenteDigitos(valor);
        return digitos.isEmpty() ? null : digitos;
    }

    private void exigirAdmin() {
        if (!sessao.isAdministrador()) {
            throw new SecurityException("Apenas administradores podem alterar configurações.");
        }
    }

    private void exigirAdministradorEmpresa() {
        if (!sessao.isAdministradorEmpresa()) {
            throw new SecurityException("Apenas o administrador da empresa pode criar usuários.");
        }
    }

    private void exigirSuperAdmin() {
        if (!sessao.isSuperAdmin()) {
            throw new SecurityException("Apenas o administrador do sistema pode gerenciar empresas.");
        }
    }
}
