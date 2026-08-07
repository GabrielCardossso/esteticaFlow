import { falha, ok, validacao, type Result } from './result';
import { Dinheiro, dividirComEscala, Quantidade } from './shared/decimal';

export const UNIDADES = ['UN', 'ML', 'L', 'KG', 'G'] as const;
export type UnidadeMedida = (typeof UNIDADES)[number];

/** Unidades que representam o saldo persistido. */
export const UNIDADES_BASE = ['UN', 'ML', 'G'] as const;
export type UnidadeBase = (typeof UNIDADES_BASE)[number];

export type DimensaoUnidade = 'UNIDADE' | 'VOLUME' | 'PESO';

export function dimensaoDaUnidade(unidade: UnidadeMedida): DimensaoUnidade {
  if (unidade === 'UN') return 'UNIDADE';
  if (unidade === 'ML' || unidade === 'L') return 'VOLUME';
  return 'PESO';
}

export function unidadeBaseDa(unidade: UnidadeMedida): UnidadeBase {
  if (unidade === 'L' || unidade === 'ML') return 'ML';
  if (unidade === 'KG' || unidade === 'G') return 'G';
  return 'UN';
}

/**
 * Converte uma quantidade informada para a unidade base da sua dimensao.
 * O banco nunca armazena litros ou quilogramas: somente mL, g ou un.
 */
export function normalizarQuantidade(
  quantidade: string | number,
  unidade: UnidadeMedida,
): Result<{ quantidade: string; unidadeBase: UnidadeBase }> {
  const validada = validarQuantidadePositiva(quantidade);
  if (!validada.ok) return validada;
  const fator = unidade === 'L' || unidade === 'KG' ? '1000' : '1';
  return ok({
    quantidade: Quantidade.multiplicar(validada.value, fator),
    unidadeBase: unidadeBaseDa(unidade),
  });
}

export function normalizarQuantidadeNaoNegativa(
  quantidade: string | number,
  unidade: UnidadeMedida,
  campo = 'quantidade',
): Result<{ quantidade: string; unidadeBase: UnidadeBase }> {
  if (Quantidade.ehNegativo(quantidade)) {
    return falha(validacao('A quantidade não pode ser negativa.', campo));
  }
  const fator = unidade === 'L' || unidade === 'KG' ? '1000' : '1';
  return ok({ quantidade: Quantidade.multiplicar(Quantidade.de(quantidade), fator), unidadeBase: unidadeBaseDa(unidade) });
}

export function unidadesCompativeis(a: UnidadeMedida, b: UnidadeMedida): boolean {
  return dimensaoDaUnidade(a) === dimensaoDaUnidade(b);
}

export function validarUnidadeCompativel(
  unidadeBase: UnidadeMedida,
  unidadeInformada: UnidadeMedida,
  campo = 'unidadeMedida',
): Result<true> {
  if (unidadeBaseDa(unidadeInformada) === unidadeBase) return ok(true);
  return falha(validacao('A unidade informada não é compatível com este produto.', campo));
}

function exibirNumero(quantidade: string): string {
  return quantidade.replace(/\.?0+$/, '') || '0';
}

/** Converte o saldo base para uma forma curta e legível para a interface. */
export function exibirQuantidadeInteligente(
  quantidadeBase: string,
  unidadeBase: UnidadeBase,
): { quantidade: string; unidade: UnidadeMedida } {
  if (unidadeBase === 'ML' && Quantidade.comparar(quantidadeBase, '1000') >= 0) {
    return { quantidade: exibirNumero(Quantidade.dividir(quantidadeBase, '1000')), unidade: 'L' };
  }
  if (unidadeBase === 'G' && Quantidade.comparar(quantidadeBase, '1000') >= 0) {
    return { quantidade: exibirNumero(Quantidade.dividir(quantidadeBase, '1000')), unidade: 'KG' };
  }
  return { quantidade: exibirNumero(quantidadeBase), unidade: unidadeBase };
}

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
