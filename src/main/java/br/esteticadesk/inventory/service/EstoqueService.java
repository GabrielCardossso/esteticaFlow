package br.esteticadesk.inventory.service;

import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import java.math.BigDecimal;
import java.util.List;

public interface EstoqueService {
    List<Estoque> listarEstoques(boolean mostrarTodos);

    List<MovimentacaoEstoque> listarMovimentacoesRecentes();

    List<CategoriaProduto> listarCategoriasParaFormulario(Long categoriaAtualId);

    ProdutoEstoqueDTO obterProduto(Long produtoId);

    void salvarProduto(ProdutoEstoqueDTO produto);

    void inativarProduto(Long produtoId);

    void reativarProduto(Long produtoId);

    void registrarEntrada(Long produtoId, BigDecimal quantidade);

    void registrarSaida(Long produtoId, BigDecimal quantidade);

    void alterarQuantidadeMinima(Long produtoId, BigDecimal quantidadeMinima);
}
