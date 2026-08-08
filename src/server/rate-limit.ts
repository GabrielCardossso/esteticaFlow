import { createHash } from 'node:crypto';
import { inArray, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { controleRateLimit } from '@/db/schema';

export const LIMITES_RATE_LIMIT = {
  login: { limite: 10, janelaSegundos: 15 * 60, bloqueioSegundos: 15 * 60 },
  pagamento: { limite: 30, janelaSegundos: 5 * 60, bloqueioSegundos: 10 * 60 },
} as const;

export interface ResultadoRateLimit {
  permitido: boolean;
  restante: number;
  limite: number;
  retryAfter: number;
  indisponivel: boolean;
}

export function respostaDeRateLimit(resultado: ResultadoRateLimit): NextResponse {
  const status = resultado.indisponivel ? 503 : 429;
  const mensagem = resultado.indisponivel
    ? 'A proteção contra abuso está temporariamente indisponível. Tente novamente em instantes.'
    : 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return NextResponse.json(
    {
      erro: {
        codigo: resultado.indisponivel ? 'RATE_LIMIT_INDISPONIVEL' : 'MUITAS_REQUISICOES',
        mensagem,
      },
    },
    {
      status,
      headers: {
        'Retry-After': String(resultado.retryAfter),
        'X-RateLimit-Limit': String(resultado.limite),
        'X-RateLimit-Remaining': String(resultado.restante),
      },
    },
  );
}

/** Obtém o primeiro IP definido pela borda da Vercel, sem confiar em dados do corpo. */
export function ipDaRequisicao(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim();
  return encaminhado ?? cabecalhos.get('x-real-ip')?.trim() ?? 'desconhecido';
}

/** Evita guardar o e-mail de login em texto puro na tabela técnica. */
export function hashRateLimit(valor: string): string {
  return createHash('sha256').update(valor.trim().toLowerCase()).digest('hex');
}

export async function consumirRateLimit(
  chave: string,
  configuracao: (typeof LIMITES_RATE_LIMIT)[keyof typeof LIMITES_RATE_LIMIT],
): Promise<ResultadoRateLimit> {
  const { limite, janelaSegundos, bloqueioSegundos } = configuracao;

  try {
    const [linha] = await db.execute<{
      permitido: boolean;
      restante: number;
      retry_after: number;
    }>(sql`
      with atualizado as (
        insert into "controle_rate_limit" as atual (
          "chave",
          "janela_inicio",
          "contagem",
          "bloqueado_ate",
          "atualizado_em"
        ) values (
          ${chave},
          now(),
          1,
          null,
          now()
        )
        on conflict ("chave") do update set
          "janela_inicio" = case
            when atual."bloqueado_ate" > now() then atual."janela_inicio"
            when atual."janela_inicio" <= now() - (${janelaSegundos} * interval '1 second') then now()
            else atual."janela_inicio"
          end,
          "contagem" = case
            when atual."bloqueado_ate" > now() then atual."contagem"
            when atual."janela_inicio" <= now() - (${janelaSegundos} * interval '1 second') then 1
            else atual."contagem" + 1
          end,
          "bloqueado_ate" = case
            when atual."bloqueado_ate" > now() then atual."bloqueado_ate"
            when atual."janela_inicio" <= now() - (${janelaSegundos} * interval '1 second') then null
            when atual."contagem" + 1 > ${limite}
              then now() + (${bloqueioSegundos} * interval '1 second')
            else null
          end,
          "atualizado_em" = now()
        returning
          "contagem",
          "janela_inicio",
          "bloqueado_ate"
      )
      select
        (
          "bloqueado_ate" is null
          or "bloqueado_ate" <= now()
        ) and "contagem" <= ${limite} as permitido,
        greatest(0, ${limite} - "contagem")::int as restante,
        greatest(
          1,
          ceil(extract(epoch from (
            coalesce(
              "bloqueado_ate",
              "janela_inicio" + (${janelaSegundos} * interval '1 second')
            ) - now()
          )))::int
        ) as retry_after
      from atualizado
    `);

    return {
      permitido: linha?.permitido === true,
      restante: Number(linha?.restante ?? 0),
      limite,
      retryAfter: Number(linha?.retry_after ?? bloqueioSegundos),
      indisponivel: false,
    };
  } catch (excecao) {
    console.error('[esteticaflow] falha no rate limit:', excecao);
    return {
      permitido: false,
      restante: 0,
      limite,
      retryAfter: 30,
      indisponivel: true,
    };
  }
}

export async function resetarRateLimit(chaves: string[]): Promise<void> {
  if (chaves.length === 0) return;
  try {
    await db.delete(controleRateLimit).where(inArray(controleRateLimit.chave, chaves));
  } catch (excecao) {
    // A limpeza é apenas de conveniência após um login válido; não deve invalidar a sessão.
    console.error('[esteticaflow] falha ao limpar rate limit:', excecao);
  }
}
