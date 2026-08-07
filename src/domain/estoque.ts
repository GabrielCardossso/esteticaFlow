import { falha, ok, validacao, type Result } from './result';
import { Dinheiro, dividirComEscala, Quantidade } from './shared/decimal';

export const UNIDADES = ['UN', 'ML', 'L', 'KG', 'G'] as const;
export type UnidadeMedida = (typeof UNIDADES)[number];

export const ROTULO_UNIDADE: Readonly<Record<UnidadeMedida, string>> = {
  UN: 'unidade',
  ML: 'mililitro',
  L: 'litro',
  KG: 'quilograma',
  G: 'grama',
};

export const TIPOS_MOVIMENTACAO = ['ENTRADA', 'SAIDA', 'AJUSTE'] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const ORIGENS_MOVIMENTACAO = ['MANUAL', 'AGENDAMENTO', 'AJUSTE'] as const;
export type OrigemMovimentacao = (typeof ORIGENS_MOVIMENTACAO)[number];

/** Teto de sanidade para lancamento financeiro de compra. */
const VALOR_MAXIMO_COMPRA = '99999999.99';

/**
 * Custo por unidade de medida. O usuario cadastra o preco da embalagem
 * fechada; o sistema deriva o custo unitario, nunca o contrario.
 */
export function calcularCustoUnitario(
  valorEmbalagem: string | number,
  quantidadeEmbalagem: string | number,
): Result<string> {
  if (!Quantidade.ehPositivo(quantidadeEmbalagem)) {
    return falha(
      validacao('A quantidade da embalagem deve ser maior que zero.', 'quantidadeEmbalagem'),
    );
  }
  if (Dinheiro.ehNegativo(valorEmbalagem)) {
    return falha(validacao('O valor da embalagem não pode ser negativo.', 'valorEmbalagem'));
  }
  return ok(dividirComEscala(valorEmbalagem, quantidadeEmbalagem, 4));
}

export interface ProdutoParaCompra {
  readonly quantidadeEmbalagem: string;
  readonly valorEmbalagem: string;
}

/**
 * Valor financeiro de uma entrada de estoque.
 *
 * Regra critica: o preco cadastrado e o da embalagem inteira. Multiplicar esse
 * preco pela quantidade em unidades inflaria a despesa em ordens de grandeza.
 * A conta correta e proporcional: (quantidade / conteudo da embalagem) x preco.
 */
export function calcularValorDaCompra(
  produto: ProdutoParaCompra,
  quantidadeUnidades: string | number,
  valorPagoInformado?: string | number | null,
): Result<string> {
  if (
    valorPagoInformado !== undefined &&
    valorPagoInformado !== null &&
    valorPagoInformado !== ''
  ) {
    if (Dinheiro.ehNegativo(valorPagoInformado)) {
      return falha(validacao('O valor pago na compra não pode ser negativo.', 'valorPago'));
    }
    const informado = Dinheiro.de(valorPagoInformado);
    if (Dinheiro.comparar(informado, VALOR_MAXIMO_COMPRA) > 0) {
      return falha(validacao('O valor da compra excede o limite permitido.', 'valorPago'));
    }
    return ok(informado);
  }

  if (!Quantidade.ehPositivo(produto.quantidadeEmbalagem)) {
    return falha(validacao('Produto sem quantidade de embalagem válida.'));
  }

  const embalagens = Quantidade.dividir(quantidadeUnidades, produto.quantidadeEmbalagem);
  const valor = Dinheiro.multiplicar(embalagens, produto.valorEmbalagem);

  if (Dinheiro.comparar(valor, VALOR_MAXIMO_COMPRA) > 0) {
    return falha(validacao('O valor da compra excede o limite permitido.'));
  }
  return ok(valor);
}

export function validarQuantidadePositiva(
  quantidade: string | number,
  campo = 'quantidade',
): Result<string> {
  if (!Quantidade.ehPositivo(quantidade)) {
    return falha(validacao('A quantidade deve ser maior que zero.', campo));
  }
  return ok(Quantidade.de(quantidade));
}

export function validarBaixa(
  saldoAtual: string,
  quantidade: string,
  nomeProduto: string,
): Result<string> {
  if (Quantidade.comparar(saldoAtual, quantidade) < 0) {
    return falha(
      validacao(`Saldo insuficiente de "${nomeProduto}". Disponível: ${saldoAtual}.`, 'quantidade'),
    );
  }
  return ok(Quantidade.subtrair(saldoAtual, quantidade));
}

export type NivelEstoque = 'CRITICO' | 'BAIXO' | 'SAUDAVEL';

/** Classificacao usada nos medidores da interface e nos alertas. */
export function nivelDoEstoque(quantidadeAtual: string, quantidadeMinima: string): NivelEstoque {
  if (Quantidade.ehZero(quantidadeAtual)) return 'CRITICO';
  if (Quantidade.comparar(quantidadeAtual, quantidadeMinima) <= 0) return 'BAIXO';
  return 'SAUDAVEL';
}

/** Percentual do saldo em relacao ao dobro do minimo, limitado a 100. */
export function percentualDoEstoque(quantidadeAtual: string, quantidadeMinima: string): number {
  const referencia = Quantidade.ehZero(quantidadeMinima)
    ? Quantidade.de(quantidadeAtual)
    : Quantidade.multiplicar(quantidadeMinima, '2');
  if (Quantidade.ehZero(referencia)) return 0;
  const razao = Quantidade.paraNumero(Quantidade.dividir(quantidadeAtual, referencia));
  return Math.max(0, Math.min(100, Math.round(razao * 100)));
}

export function descricaoDaCompra(
  nomeProduto: string,
  quantidade: string,
  unidade: UnidadeMedida,
): string {
  const limpo = quantidade.replace(/\.?0+$/, '') || '0';
  return `Compra de estoque: ${nomeProduto} (${limpo} ${unidade})`;
}
