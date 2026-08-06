import bcrypt from 'bcryptjs';

const CUSTO = 10;

export async function gerarHash(senhaPura: string): Promise<string> {
  return bcrypt.hash(senhaPura, CUSTO);
}

export async function conferirSenha(senhaPura: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(senhaPura, hash);
  } catch {
    return false;
  }
}

/** Avaliacao simples de forca, usada apenas como feedback visual no cadastro. */
export function forcaDaSenha(valor: string): { nivel: 0 | 1 | 2 | 3 | 4; rotulo: string } {
  let pontos = 0;
  if (valor.length >= 8) pontos += 1;
  if (valor.length >= 12) pontos += 1;
  if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) pontos += 1;
  if (/\d/.test(valor) && /[^\w\s]/.test(valor)) pontos += 1;

  const nivel = Math.min(4, pontos) as 0 | 1 | 2 | 3 | 4;
  const rotulos = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'] as const;
  return { nivel, rotulo: rotulos[nivel] };
}
