import { Dinheiro } from './shared/decimal';
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoDia,
  inicioDoMes,
  m,
  paraISO,
  type EntradaData,
} from './shared/tempo';

export const FILTROS_PERIODO = ['DIA', 'SEMANA', 'MES', 'ULTIMOS_6_MESES', 'ANO'] as const;
export type FiltroPeriodo = (typeof FILTROS_PERIODO)[number];

export const ROTULO_FILTRO: Readonly<Record<FiltroPeriodo, string>> = {
  DIA: 'Dia',
  SEMANA: 'Semana',
  MES: 'Mês',
  ULTIMOS_6_MESES: 'Últimos 6 meses',
  ANO: 'Ano',
};

export interface Periodo {
  readonly inicio: string;
  readonly fim: string;
}

/** Resolve o filtro em um intervalo fechado de datas (ISO), no fuso da operacao. */
export function resolverPeriodo(
  filtro: FiltroPeriodo,
  referencia: EntradaData = hojeISO(),
): Periodo {
  const base = m(referencia);
  switch (filtro) {
    case 'DIA':
      return { inicio: paraISO(base), fim: paraISO(base) };
    case 'SEMANA':
      return { inicio: paraISO(inicioDaSemana(base)), fim: paraISO(fimDaSemana(base)) };
    case 'MES':
      return { inicio: paraISO(inicioDoMes(base)), fim: paraISO(fimDoMes(base)) };
    case 'ULTIMOS_6_MESES':
      return {
        inicio: paraISO(inicioDoMes(base.clone().subtract(5, 'months'))),
        fim: paraISO(fimDoMes(base)),
      };
    case 'ANO':
      return {
        inicio: paraISO(base.clone().startOf('year')),
        fim: paraISO(base.clone().endOf('year')),
      };
  }
}

export function periodoValido(periodo: Periodo): boolean {
  return !m(periodo.inicio).isAfter(m(periodo.fim));
}

export function limitesDoPeriodo(periodo: Periodo): { inicio: Date; fim: Date } {
  return { inicio: inicioDoDia(periodo.inicio), fim: fimDoDia(periodo.fim) };
}

// --------------------------------------------------------------------------
// Indicadores
// --------------------------------------------------------------------------

export interface ResumoFinanceiro {
  readonly receita: string;
  readonly despesa: string;
  readonly saldo: string;
  readonly ticketMedio: string;
  readonly atendimentosRecebidos: number;
  readonly margem: number | null;
}

export function montarResumo(
  receita: string,
  despesa: string,
  receitaDeAtendimentos: string,
  atendimentosRecebidos: number,
): ResumoFinanceiro {
  const saldo = Dinheiro.subtrair(receita, despesa);
  const ticketMedio =
    atendimentosRecebidos > 0
      ? Dinheiro.dividir(receitaDeAtendimentos, atendimentosRecebidos)
      : Dinheiro.zero;
  const receitaNumero = Dinheiro.paraNumero(receita);
  const margem = receitaNumero === 0 ? null : (Dinheiro.paraNumero(saldo) / receitaNumero) * 100;

  return {
    receita: Dinheiro.de(receita),
    despesa: Dinheiro.de(despesa),
    saldo,
    ticketMedio,
    atendimentosRecebidos,
    margem: margem === null ? null : Number(margem.toFixed(1)),
  };
}

export interface ItemRanking {
  readonly nome: string;
  readonly quantidade: number;
  readonly valor: string;
}

/** Ordena por valor decrescente, com desempate alfabetico estavel. */
export function ordenarRanking(itens: readonly ItemRanking[]): ItemRanking[] {
  return [...itens].sort((a, b) => {
    const porValor = Dinheiro.comparar(b.valor, a.valor);
    if (porValor !== 0) return porValor;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function variacaoPercentual(atual: string, anterior: string): number | null {
  if (Dinheiro.ehZero(anterior)) return null;
  const base = Dinheiro.paraNumero(anterior);
  const delta = Dinheiro.paraNumero(Dinheiro.subtrair(atual, anterior));
  return Number(((delta / Math.abs(base)) * 100).toFixed(1));
}
