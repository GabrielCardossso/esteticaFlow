package br.esteticadesk.inventory.serviceImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.company.service.AssinaturaService;
import br.esteticadesk.enums.OrigemMovimentacao;
import br.esteticadesk.enums.TipoMovimentacao;
import br.esteticadesk.enums.UnidadeMedida;
import br.esteticadesk.exception.EstoqueInsuficienteException;
import br.esteticadesk.inventory.dto.ProdutoEstoqueDTO;
import br.esteticadesk.inventory.entity.CategoriaProduto;
import br.esteticadesk.inventory.entity.Estoque;
import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import br.esteticadesk.inventory.entity.Produto;
import br.esteticadesk.inventory.repository.CategoriaProdutoRepository;
import br.esteticadesk.inventory.repository.EstoqueRepository;
import br.esteticadesk.inventory.repository.MovimentacaoEstoqueRepository;
import br.esteticadesk.inventory.repository.ProdutoRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EstoqueServiceImplTest {
    @Mock
    private EstoqueRepository estoques;
    @Mock
    private MovimentacaoEstoqueRepository movimentacoes;
    @Mock
    private ProdutoRepository produtos;
    @Mock
    private CategoriaProdutoRepository categorias;
    @Mock
    private SessaoUsuario sessao;
    @Mock
    private AssinaturaService assinaturas;

    private EstoqueServiceImpl service;

    @BeforeEach
    void configurar() {
        service = new EstoqueServiceImpl(estoques, movimentacoes, produtos, categorias, sessao, assinaturas);
    }

    @Test
    void registraEntradaManualNaEmpresaDaSessao() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        var estoque = estoque("Produto", "10.000");
        when(estoques.findByEmpresaIdAndProdutoIdForUpdate(7L, 3L)).thenReturn(Optional.of(estoque));

        service.registrarEntrada(3L, new BigDecimal("2.500"));

        assertEquals(new BigDecimal("12.500"), estoque.getQuantidadeAtual());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoque.class);
        verify(movimentacoes).save(captor.capture());
        assertEquals(7L, captor.getValue().getEmpresaId());
        assertEquals(TipoMovimentacao.ENTRADA, captor.getValue().getTipo());
        assertEquals(OrigemMovimentacao.MANUAL, captor.getValue().getOrigem());
        assertEquals(new BigDecimal("2.500"), captor.getValue().getQuantidade());
    }

    @Test
    void cadastraProdutoComSaldoMinimoEMovimentacaoInicial() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        var categoria = new CategoriaProduto();
        when(categorias.findByIdAndEmpresaIdAndAtivoTrue(2L, 7L)).thenReturn(Optional.of(categoria));
        var dados = new ProdutoEstoqueDTO(null, " Shampoo ", UnidadeMedida.L, new BigDecimal("30.00"), 2L,
                new BigDecimal("5.000"), new BigDecimal("1.000"));

        service.salvarProduto(dados);

        var estoqueCaptor = ArgumentCaptor.forClass(Estoque.class);
        verify(estoques).save(estoqueCaptor.capture());
        assertEquals(7L, estoqueCaptor.getValue().getEmpresaId());
        assertEquals(new BigDecimal("5.000"), estoqueCaptor.getValue().getQuantidadeAtual());
        assertEquals(new BigDecimal("1.000"), estoqueCaptor.getValue().getQuantidadeMinima());
        assertEquals("Shampoo", estoqueCaptor.getValue().getProduto().getNome());

        var movimentacaoCaptor = ArgumentCaptor.forClass(MovimentacaoEstoque.class);
        verify(movimentacoes).save(movimentacaoCaptor.capture());
        assertEquals(TipoMovimentacao.ENTRADA, movimentacaoCaptor.getValue().getTipo());
        assertEquals(new BigDecimal("5.000"), movimentacaoCaptor.getValue().getQuantidade());
    }

    @Test
    void rejeitaSaidaAcimaDoSaldoSemRegistrarMovimentacao() {
        when(sessao.empresaObrigatoria()).thenReturn(7L);
        var estoque = estoque("Produto", "1.000");
        when(estoques.findByEmpresaIdAndProdutoIdForUpdate(7L, 3L)).thenReturn(Optional.of(estoque));

        assertThrows(EstoqueInsuficienteException.class,
                () -> service.registrarSaida(3L, new BigDecimal("1.001")));

        assertEquals(new BigDecimal("1.000"), estoque.getQuantidadeAtual());
        verify(movimentacoes, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejeitaQuantidadeNaoPositivaAntesDeConsultarEstoque() {
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(3L, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(3L, new BigDecimal("-1")));

        verify(estoques, never()).findByEmpresaIdAndProdutoIdForUpdate(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong());
        verify(movimentacoes, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private Estoque estoque(String nomeProduto, String quantidade) {
        var produto = new Produto();
        produto.setNome(nomeProduto);
        var estoque = new Estoque();
        estoque.setProduto(produto);
        estoque.setQuantidadeAtual(new BigDecimal(quantidade));
        estoque.setQuantidadeMinima(BigDecimal.ZERO);
        return estoque;
    }
}
