package br.esteticadesk.inventory.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.CategoriaDespesa;
import br.esteticadesk.enums.OrigemMovimentacao;
import br.esteticadesk.enums.RecursoPlano;
import br.esteticadesk.enums.TipoMovimentacao;
import br.esteticadesk.exception.EstoqueInsuficienteException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.finance.entity.Despesa;
import br.esteticadesk.finance.service.FinanceiroService;
import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import br.esteticadesk.inventory.entity.Produto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import br.esteticadesk.inventory.repository.MovimentacaoEstoqueRepository;
import br.esteticadesk.inventory.repository.ProdutoRepository;
import br.esteticadesk.inventory.service.EstoqueService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    public List<Estoque> listarEstoques(boolean mostrarTodos, String busca, boolean somenteBaixo, String ordenacao) {
        exigirAcesso();
        var empresaId = sessao.empresaObrigatoria();
        var lista = new ArrayList<>(mostrarTodos ? estoques.findByEmpresaId(empresaId)
                : estoques.findByEmpresaIdAndProdutoAtivoTrue(empresaId));
        var termo = busca == null ? "" : busca.trim();
        if (!termo.isEmpty()) {
            var termoLower = termo.toLowerCase(Locale.ROOT);
            lista.removeIf(e -> e.getProduto() == null || e.getProduto().getNome() == null
                    || !e.getProduto().getNome().toLowerCase(Locale.ROOT).contains(termoLower));
        }
        if (somenteBaixo) {
            lista.removeIf(e -> e.getQuantidadeAtual().compareTo(e.getQuantidadeMinima()) > 0);
        }
        var ordem = ordenacao == null || ordenacao.isBlank() ? "nome" : ordenacao;
        Comparator<Estoque> comparator = switch (ordem) {
            case "saldo_asc" ->
                Comparator.comparing(Estoque::getQuantidadeAtual, Comparator.nullsLast(Comparator.naturalOrder()));
            case "saldo_desc" ->
                Comparator.comparing(Estoque::getQuantidadeAtual, Comparator.nullsLast(Comparator.reverseOrder()));
            default -> Comparator.comparing(e -> e.getProduto().getNome(), String.CASE_INSENSITIVE_ORDER);
        };
        lista.sort(comparator);
        return lista;
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
                produto.getQuantidadeEmbalagem(), produto.getValorEmbalagem(), produto.getCategoriaProduto().getId(),
                BigDecimal.ZERO, estoque.getQuantidadeMinima());
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
                var valorPago = calcularValorCompra(produto, dados.quantidadeInicial(), null);
                registrarMovimentacao(empresaId, produto, TipoMovimentacao.ENTRADA, dados.quantidadeInicial(),
                        "Estoque inicial", valorPago);
                registrarDespesaDeCompra(produto, dados.quantidadeInicial(), valorPago);
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
        buscarProduto(produtoId, sessao.empresaObrigatoria()).setAtivo(false);
    }

    @Override
    public void reativarProduto(Long produtoId) {
        exigirAcesso();
        buscarProduto(produtoId, sessao.empresaObrigatoria()).setAtivo(true);
    }

    public void registrarEntrada(Long produtoId, BigDecimal quantidade) {
        registrarEntrada(produtoId, quantidade, null, null);
    }

    @Override
    public void registrarEntrada(Long produtoId, BigDecimal quantidade, BigDecimal valorPagoCompra, String motivo) {
        exigirAcesso();
        validarQuantidadePositiva(quantidade);
        var empresaId = sessao.empresaObrigatoria();
        var estoque = buscarEstoqueParaAtualizacao(empresaId, produtoId);
        exigirProdutoAtivo(estoque);
        var produto = estoque.getProduto();
        var valorPago = calcularValorCompra(produto, quantidade, valorPagoCompra);
        estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().add(quantidade));
        registrarMovimentacao(empresaId, produto, TipoMovimentacao.ENTRADA, quantidade,
                motivo == null || motivo.isBlank() ? "Reposição de estoque" : motivo.trim(), valorPago);
        registrarDespesaDeCompra(produto, quantidade, valorPago);
    }

    public void registrarSaida(Long produtoId, BigDecimal quantidade) {
        exigirAcesso();
        validarQuantidadePositiva(quantidade);
        var empresaId = sessao.empresaObrigatoria();
        var estoque = buscarEstoqueParaAtualizacao(empresaId, produtoId);
        exigirProdutoAtivo(estoque);
        if (estoque.getQuantidadeAtual().compareTo(quantidade) < 0) {
            throw new EstoqueInsuficienteException(estoque.getProduto().getNome());
        }
        estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().subtract(quantidade));
        registrarMovimentacao(empresaId, estoque.getProduto(), TipoMovimentacao.SAIDA, quantidade,
                "Saída manual", null);
    }

    public void alterarQuantidadeMinima(Long produtoId, BigDecimal quantidadeMinima) {
        exigirAcesso();
        if (quantidadeMinima == null || quantidadeMinima.signum() < 0) {
            throw new IllegalArgumentException("Quantidade mínima não pode ser negativa.");
        }
        buscarEstoqueParaAtualizacao(sessao.empresaObrigatoria(), produtoId).setQuantidadeMinima(quantidadeMinima);
    }

    /**
     * Valor financeiro da compra = valor informado pelo usuário OU
     * (quantidade / quantidade_embalagem) * valor_embalagem.
     * Nunca multiplica o preço da embalagem pela quantidade unitária crua.
     */
    private BigDecimal calcularValorCompra(Produto produto, BigDecimal quantidadeUnidades, BigDecimal valorPagoInformado) {
        if (valorPagoInformado != null) {
            if (valorPagoInformado.signum() < 0) {
                throw new IllegalArgumentException("O valor pago na compra não pode ser negativo.");
            }
            return valorPagoInformado.setScale(2, RoundingMode.HALF_UP);
        }
        var embalagens = quantidadeUnidades.divide(produto.getQuantidadeEmbalagem(), 6, RoundingMode.HALF_UP);
        return embalagens.multiply(produto.getValorEmbalagem()).setScale(2, RoundingMode.HALF_UP);
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
            BigDecimal quantidade, String motivo, BigDecimal valorFinanceiro) {
        var mov = new MovimentacaoEstoque();
        mov.setEmpresaId(empresaId);
        mov.setProduto(produto);
        mov.setTipo(tipo);
        mov.setOrigem(OrigemMovimentacao.MANUAL);
        mov.setQuantidade(quantidade);
        mov.setMotivo(motivo);
        mov.setValorFinanceiro(valorFinanceiro);
        mov.setUsuario(sessao.getUsuarioLogado());
        movimentacoes.save(mov);
    }

    private void registrarDespesaDeCompra(Produto produto, BigDecimal quantidade, BigDecimal valorPago) {
        if (valorPago == null || valorPago.signum() == 0) {
            return;
        }
        if (valorPago.compareTo(new BigDecimal("99999999.99")) > 0) {
            throw new IllegalArgumentException("O valor da compra excede o limite permitido.");
        }
        var despesa = new Despesa();
        despesa.setDescricao("Compra de estoque: " + produto.getNome()
                + " (" + quantidade.stripTrailingZeros().toPlainString() + " "
                + produto.getUnidadeMedida() + ")");
        despesa.setCategoria(CategoriaDespesa.FORNECEDOR);
        despesa.setValor(valorPago);
        despesa.setDataPagamento(HorarioSistema.hoje());
        financeiro.registrarDespesa(despesa);
    }

    private void preencherProduto(Produto produto, ProdutoEstoqueDTO dados, CategoriaProduto categoria) {
        produto.setNome(dados.nome().trim());
        produto.setUnidadeMedida(dados.unidadeMedida());
        produto.setQuantidadeEmbalagem(dados.quantidadeEmbalagem());
        produto.setValorEmbalagem(dados.valorEmbalagem().setScale(2, RoundingMode.HALF_UP));
        produto.setPrecoCusto(dados.custoUnitario());
        produto.setCategoriaProduto(categoria);
    }

    private void validarProduto(ProdutoEstoqueDTO dados) {
        if (dados == null || dados.nome() == null || dados.nome().isBlank()) {
            throw new IllegalArgumentException("Nome do produto é obrigatório.");
        }
        if (dados.unidadeMedida() == null || dados.quantidadeEmbalagem() == null || dados.valorEmbalagem() == null
                || dados.categoriaProdutoId() == null || dados.quantidadeInicial() == null
                || dados.quantidadeMinima() == null) {
            throw new IllegalArgumentException("Preencha todos os campos obrigatórios.");
        }
        if (dados.quantidadeEmbalagem().signum() <= 0) {
            throw new IllegalArgumentException("A quantidade da embalagem deve ser maior que zero.");
        }
        if (dados.valorEmbalagem().signum() < 0 || dados.quantidadeInicial().signum() < 0
                || dados.quantidadeMinima().signum() < 0) {
            throw new IllegalArgumentException("Valores e quantidades não podem ser negativos.");
        }
    }

    private void validarQuantidadePositiva(BigDecimal quantidade) {
        if (quantidade == null || quantidade.signum() <= 0) {
            throw new IllegalArgumentException("Quantidade deve ser maior que zero.");
        }
    }

    private void exigirAcesso() {
        assinaturas.exigirRecurso(RecursoPlano.ESTOQUE);
    }
}
