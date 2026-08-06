/**
 * Result minimo. Erros de negocio sao valores; excecoes ficam reservadas para
 * o inesperado (falha de infraestrutura, bug). Nao usamos fp-ts/effect: a
 * complexidade do dominio nao justifica a dependencia.
 */
export type Result<T, E = FalhaDominio> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function falha<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Codigos de falha do dominio, mapeados para status HTTP na borda. */
export type CodigoFalha =
  | 'VALIDACAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'NAO_AUTORIZADO'
  | 'NAO_AUTENTICADO'
  | 'RECURSO_DO_PLANO'
  | 'CONFIRMACAO_NECESSARIA'
  | 'ESTADO_INVALIDO';

export interface FalhaDominio {
  readonly codigo: CodigoFalha;
  readonly mensagem: string;
  readonly campo?: string;
  readonly detalhes?: Readonly<Record<string, unknown>>;
}

export function erro(
  codigo: CodigoFalha,
  mensagem: string,
  extra?: { campo?: string; detalhes?: Record<string, unknown> },
): FalhaDominio {
  const base: FalhaDominio = { codigo, mensagem };
  if (extra?.campo !== undefined && extra.detalhes !== undefined) {
    return { ...base, campo: extra.campo, detalhes: extra.detalhes };
  }
  if (extra?.campo !== undefined) return { ...base, campo: extra.campo };
  if (extra?.detalhes !== undefined) return { ...base, detalhes: extra.detalhes };
  return base;
}

export const validacao = (mensagem: string, campo?: string): FalhaDominio =>
  campo === undefined ? erro('VALIDACAO', mensagem) : erro('VALIDACAO', mensagem, { campo });

export const naoEncontrado = (mensagem: string): FalhaDominio => erro('NAO_ENCONTRADO', mensagem);

export const conflito = (mensagem: string, campo?: string): FalhaDominio =>
  campo === undefined ? erro('CONFLITO', mensagem) : erro('CONFLITO', mensagem, { campo });

export const naoAutorizado = (mensagem: string): FalhaDominio => erro('NAO_AUTORIZADO', mensagem);

export const estadoInvalido = (mensagem: string): FalhaDominio =>
  erro('ESTADO_INVALIDO', mensagem);

export const HTTP_POR_CODIGO: Readonly<Record<CodigoFalha, number>> = {
  VALIDACAO: 422,
  NAO_ENCONTRADO: 404,
  CONFLITO: 409,
  NAO_AUTORIZADO: 403,
  NAO_AUTENTICADO: 401,
  RECURSO_DO_PLANO: 402,
  CONFIRMACAO_NECESSARIA: 409,
  ESTADO_INVALIDO: 409,
};
