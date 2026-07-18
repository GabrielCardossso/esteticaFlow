package br.esteticadesk.inventory.service;

import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import java.math.BigDecimal;
import java.util.List;

public interface EstoqueService {
    List<Estoque> listarEstoques();

    List<MovimentacaoEstoque> listarMovimentacoesRecentes();

    List<CategoriaProduto> listarCategoriasAtivas();

    ProdutoEstoqueDTO obterProduto(Long produtoId);

    void salvarProduto(ProdutoEstoqueDTO produto);

    void inativarProduto(Long produtoId);

    void registrarEntrada(Long produtoId, BigDecimal quantidade);

    void registrarSaida(Long produtoId, BigDecimal quantidade);

    void alterarQuantidadeMinima(Long produtoId, BigDecimal quantidadeMinima);
}
