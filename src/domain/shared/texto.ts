/** Normalizacoes de texto usadas na fronteira de entrada. */

export function textoOpcional(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}

export function normalizarEmail(valor: string | null | undefined): string | null {
  const texto = textoOpcional(valor);
  return texto === null ? null : texto.toLowerCase();
}

export function normalizarUf(valor: string | null | undefined): string | null {
  const texto = textoOpcional(valor);
  return texto === null ? null : texto.toUpperCase();
}

/** Remove acentos e baixa a caixa, para comparacao e busca. */
export function chaveDeBusca(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function contemTermo(valor: string | null | undefined, termo: string): boolean {
  if (termo === '') return true;
  return chaveDeBusca(valor).includes(chaveDeBusca(termo));
}

export function truncar(valor: string, limite: number): string {
  if (valor.length <= limite) return valor;
  return `${valor.slice(0, Math.max(0, limite - 3))}...`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  return `${primeira}${ultima}`.toUpperCase() || '?';
}

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMERO = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatarMoeda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return MOEDA.format(0);
  return MOEDA.format(Number(valor));
}

export function formatarQuantidade(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '0';
  return NUMERO.format(Number(valor));
}

export function formatarPercentual(valor: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor)}%`;
}
