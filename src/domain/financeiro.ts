import { desescalar, escalar } from './shared/decimal';

export const MAXIMO_PARCELAS = 12;

export function permiteParcelamento(nomeFormaPagamento: string): boolean {
  return nomeFormaPagamento
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .includes('credito');
}

/** Divide o total em centavos exatos, distribuindo o resto nas primeiras parcelas. */
export function dividirEmParcelas(valor: string, quantidade: number): string[] {
  if (!Number.isInteger(quantidade) || quantidade < 2 || quantidade > MAXIMO_PARCELAS) {
    throw new RangeError(`A quantidade de parcelas deve ficar entre 2 e ${MAXIMO_PARCELAS}.`);
  }

  const total = escalar(valor, 2);
  if (total < BigInt(quantidade)) {
    throw new RangeError('O valor total precisa permitir parcelas de pelo menos R$ 0,01.');
  }

  const divisor = BigInt(quantidade);
  const base = total / divisor;
  const resto = total % divisor;

  return Array.from({ length: quantidade }, (_, indice) =>
    desescalar(base + (BigInt(indice) < resto ? 1n : 0n), 2),
  );
}
