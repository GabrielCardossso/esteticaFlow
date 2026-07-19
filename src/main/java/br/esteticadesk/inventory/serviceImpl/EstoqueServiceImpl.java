package br.esteticadesk.inventory.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.*;
import br.esteticadesk.exception.EstoqueInsuficienteException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.service.FinanceiroService;
import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.entity.*;
import br.esteticadesk.inventory.repository.*;
import br.esteticadesk.inventory.service.EstoqueService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EstoqueServiceImpl implements EstoqueService {
    private final EstoqueRepository estoques;
    private final MovimentacaoEstoqueRepository movimentacoes;
    private final ProdutoRepository produtos;
    private final CategoriaProdutoRepository categorias;
    private final SessaoUsuario sessao;
    private final AssinaturaService assinaturas;
    private final FinanceiroService financeiro;

    public EstoqueServiceImpl(EstoqueRepository estoques, MovimentacaoEstoqueRepository movimentacoes,
            ProdutoRepository produtos, CategoriaProdutoRepository categorias, SessaoUsuario sessao,
            AssinaturaService assinaturas, FinanceiroService financeiro) {
        this.estoques = estoques;
        this.movimentacoes = movimentacoes;
        this.produtos = produtos;
        this.categorias = categorias;
        this.sessao = sessao;
        this.assinaturas = assinaturas;
        this.financeiro = financeiro;
    }

    @Transactional(readOnly = true)
    public List<Estoque> listarEstoques(boolean mostrarTodos) {
        exigirAcesso();
        var empresaId = sessao.empresaObrigatoria();
        return mostrarTodos ? estoques.findByEmpresaId(empresaId)
                : estoques.findByEmpresaIdAndProdutoAtivoTrue(empresaId);
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoEstoque> listarMovimentacoesRecentes() {
        exigirAcesso();
        return movimentacoes.findTop20ByEmpresaIdOrderByDataMovimentacaoDesc(sessao.empresaObrigatoria());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaProduto> listarCategoriasParaFormulario(Long categoriaAtualId) {
        exigirAcesso();
        var empresaId = sessao.empresaObrigatoria();
        var disponiveis = new ArrayList<>(categorias.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        if (categoriaAtualId != null && disponiveis.stream().noneMatch(c -> c.getId().equals(categoriaAtualId))) {
            categorias.findByIdAndEmpresaId(categoriaAtualId, empresaId).ifPresent(disponiveis::add);
        }
        return disponiveis;
    }

    @Transactional(readOnly = true)
    public ProdutoEstoqueDTO obterProduto(Long produtoId) {
        exigirAcesso();
        var empresaId = sessao.empresaObrigatoria();
        var produto = buscarProduto(produtoId, empresaId);
        var estoque = estoques.findByEmpresaIdAndProdutoId(empresaId, produtoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
        return new ProdutoEstoqueDTO(produto.getId(), produto.getNome(), produto.getUnidadeMedida(),
                produto.getPrecoCusto(), produto.getCategoriaProduto().getId(), BigDecimal.ZERO,
                estoque.getQuantidadeMinima());
    }

    public void salvarProduto(ProdutoEstoqueDTO dados) {
        exigirAcesso();
        validarProduto(dados);
        var empresaId = sessao.empresaObrigatoria();
        var produtoExistente = dados.id() == null ? null : buscarProduto(dados.id(), empresaId);
        var categoria = categorias.findByIdAndEmpresaIdAndAtivoTrue(dados.categoriaProdutoId(), empresaId)
                .orElseGet(() -> {
                    if (produtoExistente != null
                            && produtoExistente.getCategoriaProduto().getId().equals(dados.categoriaProdutoId())) {
                        return produtoExistente.getCategoriaProduto();
                    }
                    throw new RecursoNaoEncontradoException("Categoria de produto não encontrada ou inativa.");
                });

        if (dados.id() == null) {
            var produto = new Produto();
            produto.setEmpresaId(empresaId);
            preencherProduto(produto, dados, categoria);
            produto.setAtivo(true);
            produtos.save(produto);

            var estoque = new Estoque();
            estoque.setEmpresaId(empresaId);
            estoque.setProduto(produto);
            estoque.setQuantidadeAtual(dados.quantidadeInicial());
            estoque.setQuantidadeMinima(dados.quantidadeMinima());
            estoques.save(estoque);
            if (dados.quantidadeInicial().signum() > 0) {
                registrarMovimentacao(empresaId, produto, TipoMovimentacao.ENTRADA, dados.quantidadeInicial());
                registrarDespesaDeEntrada(produto, dados.quantidadeInicial());
            }
            return;
        }

        var produto = produtoExistente;
        preencherProduto(produto, dados, categoria);
        var estoque = buscarEstoqueParaAtualizacao(empresaId, produto.getId());
        estoque.setQuantidadeMinima(dados.quantidadeMinima());
    }

    public void inativarProduto(Long produtoId) {
        exigirAcesso();
        var produto = buscarProduto(produtoId, sessao.empresaObrigatoria());
        produto.setAtivo(false);
    }

    @Override
    public void reativarProduto(Long produtoId) {
        exigirAcesso();
        buscarProduto(produtoId, sessao.empresaObrigatoria()).setAtivo(true);
    }

    public void registrarEntrada(Long produtoId, BigDecimal quantidade) {
        exigirAcesso();
        validarQuantidadePositiva(quantidade);
        var empresaId = sessao.empresaObrigatoria();
        var estoque = buscarEstoqueParaAtualizacao(empresaId, produtoId);
        exigirProdutoAtivo(estoque);
        estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().add(quantidade));
        registrarMovimentacao(empresaId, estoque.getProduto(), TipoMovimentacao.ENTRADA, quantidade);
        registrarDespesaDeEntrada(estoque.getProduto(), quantidade);
    }

    public void registrarSaida(Long produtoId, BigDecimal quantidade) {
        exigirAcesso();
        validarQuantidadePositiva(quantidade);
        var empresaId = sessao.empresaObrigatoria();
        var estoque = buscarEstoqueParaAtualizacao(empresaId, produtoId);
        exigirProdutoAtivo(estoque);
        if (estoque.getQuantidadeAtual().compareTo(quantidade) < 0)
            throw new EstoqueInsuficienteException(estoque.getProduto().getNome());
        estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().subtract(quantidade));
        registrarMovimentacao(empresaId, estoque.getProduto(), TipoMovimentacao.SAIDA, quantidade);
    }

    public void alterarQuantidadeMinima(Long produtoId, BigDecimal quantidadeMinima) {
        exigirAcesso();
        if (quantidadeMinima == null || quantidadeMinima.signum() < 0)
            throw new IllegalArgumentException("Quantidade mínima não pode ser negativa.");
        var estoque = buscarEstoqueParaAtualizacao(sessao.empresaObrigatoria(), produtoId);
        estoque.setQuantidadeMinima(quantidadeMinima);
    }

    private Estoque buscarEstoqueParaAtualizacao(Long empresaId, Long produtoId) {
        return estoques.findByEmpresaIdAndProdutoIdForUpdate(empresaId, produtoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
    }

    private Produto buscarProduto(Long produtoId, Long empresaId) {
        return produtos.findByIdAndEmpresaId(produtoId, empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto não encontrado."));
    }

    private void exigirProdutoAtivo(Estoque estoque) {
        if (!Boolean.TRUE.equals(estoque.getProduto().getAtivo())) {
            throw new IllegalStateException("Não é permitido movimentar um produto inativo.");
        }
    }

    private void registrarMovimentacao(Long empresaId, Produto produto, TipoMovimentacao tipo,
            BigDecimal quantidade) {
        var mov = new MovimentacaoEstoque();
        mov.setEmpresaId(empresaId);
        mov.setProduto(produto);
        mov.setTipo(tipo);
        mov.setOrigem(OrigemMovimentacao.MANUAL);
        mov.setQuantidade(quantidade);
        movimentacoes.save(mov);
    }

    private void registrarDespesaDeEntrada(Produto produto, BigDecimal quantidade) {
        var valor = produto.getPrecoCusto().multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
        if (valor.signum() == 0) {
            return;
        }
        if (valor.compareTo(new BigDecimal("99999999.99")) > 0) {
            throw new IllegalArgumentException("O custo total da entrada excede o limite permitido.");
        }
        var despesa = new Despesa();
        despesa.setDescricao("Reposição de estoque: " + produto.getNome()
                + " (" + quantidade.stripTrailingZeros().toPlainString() + " "
                + produto.getUnidadeMedida() + ")");
        despesa.setCategoria(CategoriaDespesa.FORNECEDOR);
        despesa.setValor(valor);
        despesa.setDataPagamento(LocalDate.now());
        financeiro.registrarDespesa(despesa);
    }

    private void preencherProduto(Produto produto, ProdutoEstoqueDTO dados, CategoriaProduto categoria) {
        produto.setNome(dados.nome().trim());
        produto.setUnidadeMedida(dados.unidadeMedida());
        produto.setPrecoCusto(dados.precoCusto());
        produto.setCategoriaProduto(categoria);
    }

    private void validarProduto(ProdutoEstoqueDTO dados) {
        if (dados == null || dados.nome() == null || dados.nome().isBlank())
            throw new IllegalArgumentException("Nome do produto é obrigatório.");
        if (dados.unidadeMedida() == null || dados.precoCusto() == null || dados.categoriaProdutoId() == null
                || dados.quantidadeInicial() == null || dados.quantidadeMinima() == null)
            throw new IllegalArgumentException("Preencha todos os campos obrigatórios.");
        if (dados.precoCusto().signum() < 0 || dados.quantidadeInicial().signum() < 0
                || dados.quantidadeMinima().signum() < 0)
            throw new IllegalArgumentException("Preço e quantidades não podem ser negativos.");
    }

    private void validarQuantidadePositiva(BigDecimal quantidade) {
        if (quantidade == null || quantidade.signum() <= 0)
            throw new IllegalArgumentException("Quantidade deve ser maior que zero.");
    }

    private void exigirAcesso() {
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
    }
}
