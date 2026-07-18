package br.esteticadesk.inventory.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.enums.*;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.inventory.entity.*;
import br.esteticadesk.inventory.repository.*;
import br.esteticadesk.inventory.service.EstoqueService;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EstoqueServiceImpl implements EstoqueService {
    private final EstoqueRepository estoques;
    private final MovimentacaoEstoqueRepository movimentacoes;
    private final SessaoUsuario sessao;

    public EstoqueServiceImpl(EstoqueRepository estoques, MovimentacaoEstoqueRepository movimentacoes,
            SessaoUsuario sessao) {
        this.estoques = estoques;
        this.movimentacoes = movimentacoes;
        this.sessao = sessao;
    }

    public void registrarEntrada(Long produtoId, BigDecimal quantidade) {
        if (quantidade == null || quantidade.signum() <= 0)
            throw new IllegalArgumentException("Quantidade deve ser maior que zero.");
        var empresaId = sessao.empresaObrigatoria();
        var estoque = estoques.findByEmpresaIdAndProdutoId(empresaId, produtoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Estoque não encontrado."));
        estoque.setQuantidadeAtual(estoque.getQuantidadeAtual().add(quantidade));
        estoques.save(estoque);
        var mov = new MovimentacaoEstoque();
        mov.setEmpresaId(empresaId);
        mov.setProduto(estoque.getProduto());
        mov.setTipo(TipoMovimentacao.ENTRADA);
        mov.setOrigem(OrigemMovimentacao.MANUAL);
        mov.setQuantidade(quantidade);
        movimentacoes.save(mov);
    }
}
