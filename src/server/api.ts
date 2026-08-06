import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { carregarContexto, type Contexto } from '@/auth/contexto';
import { HTTP_POR_CODIGO, type FalhaDominio, type Result } from '@/domain/result';

export interface CorpoDeErro {
  readonly erro: {
    readonly codigo: string;
    readonly mensagem: string;
    readonly campo?: string;
    readonly detalhes?: Record<string, unknown>;
  };
}

export function respostaDeFalha(falhaDominio: FalhaDominio): NextResponse<CorpoDeErro> {
  return NextResponse.json(
    { erro: { ...falhaDominio } } as CorpoDeErro,
    { status: HTTP_POR_CODIGO[falhaDominio.codigo] },
  );
}

export function responder<T>(resultado: Result<T>, status = 200): NextResponse {
  if (!resultado.ok) return respostaDeFalha(resultado.error);
  return NextResponse.json(resultado.value, { status });
}

/** Erros de validacao do Zod viram 422 com o primeiro campo problematico. */
export function respostaDeZod(erroZod: z.ZodError): NextResponse<CorpoDeErro> {
  const primeiro = erroZod.issues[0];
  return NextResponse.json(
    {
      erro: {
        codigo: 'VALIDACAO',
        mensagem: primeiro?.message ?? 'Dados inválidos.',
        campo: primeiro?.path.join('.') ?? undefined,
        detalhes: {
          issues: erroZod.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensagem: issue.message,
          })),
        },
      },
    } as CorpoDeErro,
    { status: 422 },
  );
}

type Manipulador<T> = (contexto: Contexto) => Promise<Result<T>>;

/** Executa a rota com contexto carregado, traduzindo falhas para HTTP. */
export async function comContexto<T>(manipulador: Manipulador<T>, status = 200) {
  const contexto = await carregarContexto();
  if (!contexto.ok) return respostaDeFalha(contexto.error);
  try {
    return responder(await manipulador(contexto.value), status);
  } catch (excecao) {
    return respostaDeErroInesperado(excecao);
  }
}

export function respostaDeErroInesperado(excecao: unknown): NextResponse<CorpoDeErro> {
  const detalhe = excecao instanceof Error ? excecao.message : 'Erro desconhecido';
  console.error('[esteticaflow] falha inesperada:', excecao);
  return NextResponse.json(
    {
      erro: {
        codigo: 'ERRO_INTERNO',
        mensagem: 'Não foi possível concluir a operação. Tente novamente.',
        detalhes: process.env.NODE_ENV === 'development' ? { detalhe } : undefined,
      },
    } as CorpoDeErro,
    { status: 500 },
  );
}

/** Le e valida o corpo JSON da requisicao. */
export async function lerCorpo<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ ok: true; dados: z.output<S> } | { ok: false; resposta: NextResponse }> {
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: { codigo: 'VALIDACAO', mensagem: 'Corpo da requisição inválido.' } },
        { status: 400 },
      ),
    };
  }
  const analisado = schema.safeParse(bruto);
  if (!analisado.success) return { ok: false, resposta: respostaDeZod(analisado.error) };
  return { ok: true, dados: analisado.data };
}

/** Le e valida a query string. */
export function lerQuery<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): { ok: true; dados: z.output<S> } | { ok: false; resposta: NextResponse } {
  const url = new URL(request.url);
  const bruto: Record<string, string | string[]> = {};
  for (const [chave, valor] of url.searchParams.entries()) {
    const existente = bruto[chave];
    if (existente === undefined) {
      bruto[chave] = valor;
    } else if (Array.isArray(existente)) {
      existente.push(valor);
    } else {
      bruto[chave] = [existente, valor];
    }
  }
  const analisado = schema.safeParse(bruto);
  if (!analisado.success) return { ok: false, resposta: respostaDeZod(analisado.error) };
  return { ok: true, dados: analisado.data };
}

/** Extrai e valida o id numerico de um parametro de rota. */
export function lerId(valor: string): number | null {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}
