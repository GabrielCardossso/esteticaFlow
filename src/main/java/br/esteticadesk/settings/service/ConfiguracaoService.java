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
import java.math.BigDecimal;
import java.time.LocalDate;
import br.esteticadesk.finance.entity.FormaPagamento;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import java.util.List;
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
        atual.setRazaoSocial(dados.getRazaoSocial());
        atual.setNomeFantasia(dados.getNomeFantasia());
        atual.setCnpj(dados.getCnpj());
        atual.setTelefone(dados.getTelefone());
        atual.setEmail(dados.getEmail());
        return empresas.save(atual);
    }

    public List<Usuario> usuarios() {
        exigirAdmin();
        return usuarios.findByEmpresaIdOrderByNome(sessao.empresaObrigatoria());
    }

    public Usuario criarUsuario(String nome, String email, String senha, PapelUsuario papel) {
        exigirAdministradorEmpresa();
        if (papel == PapelUsuario.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN não pode ser criado na gestão da empresa.");
        }
        if (papel == null) {
            papel = PapelUsuario.FUNCIONARIO;
        }
        if (usuarios.findByEmail(email.trim().toLowerCase()).isPresent()) {
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
        u.setNome(nome.trim());
        u.setEmail(email.trim().toLowerCase());
        u.setSenhaHash(encoder.encode(senha));
        u.setPapel(papel);
        u.setAtivo(true);
        return usuarios.save(u);
    }

    public List<FormaPagamento> formasPagamento() {
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        return formas.findAll().stream().filter(f -> f.getEmpresaId().equals(sessao.empresaObrigatoria())).toList();
    }

    public FormaPagamento criarFormaPagamento(String nome) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.FINANCEIRO);
        var f = new FormaPagamento();
        f.setEmpresaId(sessao.empresaObrigatoria());
        f.setNome(nome.trim());
        f.setAtivo(true);
        return formas.save(f);
    }

    public List<CategoriaProduto> categorias() {
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        return categorias.findByEmpresaIdAndAtivoTrueOrderByNome(sessao.empresaObrigatoria());
    }

    public CategoriaProduto criarCategoria(String nome) {
        exigirAdmin();
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
        var nomeNormalizado = nome == null ? "" : nome.trim();
        if (nomeNormalizado.isEmpty()) {
            throw new IllegalArgumentException("Nome da categoria é obrigatório.");
        }
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

    public List<Empresa> listarEmpresas() {
        exigirSuperAdmin();
        return empresas.findAllByOrderByNomeFantasiaAsc();
    }

    public Empresa criarEmpresa(String razaoSocial, String nomeFantasia, String cnpj, String telefone, String email,
            String adminNome, String adminEmail, String adminSenha, PlanoAssinatura plano,
            BigDecimal valorMensalidade, LocalDate proximoVencimento) {
        exigirSuperAdmin();
        if (plano == null || valorMensalidade == null || valorMensalidade.signum() < 0
                || proximoVencimento == null) {
            throw new IllegalArgumentException("Plano, valor não negativo e vencimento são obrigatórios.");
        }
        if (empresas.findByCnpj(cnpj.trim()).isPresent()) {
            throw new IllegalArgumentException("CNPJ já cadastrado.");
        }
        if (usuarios.findByEmail(adminEmail.trim().toLowerCase()).isPresent()) {
            throw new IllegalArgumentException("E-mail do administrador já cadastrado.");
        }
        if (adminSenha == null || adminSenha.length() < 6) {
            throw new IllegalArgumentException("A senha do administrador deve ter pelo menos 6 caracteres.");
        }

        var empresa = new Empresa();
        empresa.setRazaoSocial(razaoSocial.trim());
        empresa.setNomeFantasia(nomeFantasia.trim());
        empresa.setCnpj(cnpj.trim());
        empresa.setTelefone(telefone == null ? null : telefone.trim());
        empresa.setEmail(email == null ? null : email.trim().toLowerCase());
        empresa.setAtivo(true);
        empresa.setPlano(plano);
        empresa.setValorMensalidade(valorMensalidade);
        empresa.setProximoVencimento(proximoVencimento);
        empresa = empresas.save(empresa);

        var admin = new Usuario();
        admin.setEmpresaId(empresa.getId());
        admin.setNome(adminNome.trim());
        admin.setEmail(adminEmail.trim().toLowerCase());
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
