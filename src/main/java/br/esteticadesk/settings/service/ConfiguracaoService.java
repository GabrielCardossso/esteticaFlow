package br.esteticadesk.settings.service;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.entity.Configuracao;
import br.esteticadesk.company.entity.Empresa;
import br.esteticadesk.company.repository.ConfiguracaoRepository;
import br.esteticadesk.company.repository.EmpresaRepository;
import br.esteticadesk.employee.entity.Usuario;
import br.esteticadesk.employee.repository.UsuarioRepository;
import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.finance.entity.FormaPagamento;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ConfiguracaoService {
    private final SessaoUsuario sessao;
    private final EmpresaRepository empresas;
    private final ConfiguracaoRepository configuracoes;
    private final UsuarioRepository usuarios;
    private final FormaPagamentoRepository formas;
    private final CategoriaProdutoRepository categorias;
    private final PasswordEncoder encoder;

    public ConfiguracaoService(SessaoUsuario sessao, EmpresaRepository empresas, ConfiguracaoRepository configuracoes,
            UsuarioRepository usuarios, FormaPagamentoRepository formas, CategoriaProdutoRepository categorias,
            PasswordEncoder encoder) {
        this.sessao = sessao; this.empresas = empresas; this.configuracoes = configuracoes; this.usuarios = usuarios;
        this.formas = formas; this.categorias = categorias; this.encoder = encoder;
    }
    public Empresa empresaAtual() { return empresas.findById(sessao.empresaObrigatoria()).orElseThrow(); }
    public Empresa salvarEmpresa(Empresa dados) {
        var atual = empresaAtual(); atual.setRazaoSocial(dados.getRazaoSocial()); atual.setNomeFantasia(dados.getNomeFantasia());
        atual.setCnpj(dados.getCnpj()); atual.setTelefone(dados.getTelefone()); atual.setEmail(dados.getEmail()); return empresas.save(atual);
    }
    public List<Usuario> usuarios() { exigirAdmin(); return usuarios.findByEmpresaIdOrderByNome(sessao.empresaObrigatoria()); }
    public Usuario criarUsuario(String nome, String email, String senha, PapelUsuario papel) {
        exigirAdmin(); if (usuarios.findByEmail(email.trim().toLowerCase()).isPresent()) throw new IllegalArgumentException("E-mail já cadastrado.");
        if (senha == null || senha.length() < 6) throw new IllegalArgumentException("A senha deve ter pelo menos 6 caracteres.");
        var u = new Usuario(); u.setEmpresaId(sessao.empresaObrigatoria()); u.setNome(nome.trim()); u.setEmail(email.trim().toLowerCase());
        u.setSenhaHash(encoder.encode(senha)); u.setPapel(papel); u.setAtivo(true); return usuarios.save(u);
    }
    public List<FormaPagamento> formasPagamento() { return formas.findAll().stream().filter(f -> f.getEmpresaId().equals(sessao.empresaObrigatoria())).toList(); }
    public FormaPagamento criarFormaPagamento(String nome) { var f = new FormaPagamento(); f.setEmpresaId(sessao.empresaObrigatoria()); f.setNome(nome.trim()); f.setAtivo(true); return formas.save(f); }
    public List<CategoriaProduto> categorias() { return categorias.findByEmpresaIdAndAtivoTrueOrderByNome(sessao.empresaObrigatoria()); }
    public CategoriaProduto criarCategoria(String nome) { var c = new CategoriaProduto(); c.setEmpresaId(sessao.empresaObrigatoria()); c.setNome(nome.trim()); c.setAtivo(true); return categorias.save(c); }
    public boolean parametro(String chave, boolean padrao) { return configuracoes.findByEmpresaIdAndChave(sessao.empresaObrigatoria(), chave).map(c -> Boolean.parseBoolean(c.getValor())).orElse(padrao); }
    public void salvarParametro(String chave, boolean valor) { var c = configuracoes.findByEmpresaIdAndChave(sessao.empresaObrigatoria(), chave).orElseGet(Configuracao::new); c.setEmpresaId(sessao.empresaObrigatoria()); c.setChave(chave); c.setValor(Boolean.toString(valor)); configuracoes.save(c); }
    private void exigirAdmin() { if (!sessao.isAdministrador()) throw new SecurityException("Apenas administradores podem alterar configurações."); }
}
