import { NextResponse } from 'next/server';
import { exigirRecurso } from '@/auth/contexto';
import { comContexto, lerId } from '@/server/api';
import { marcarParcelaPaga } from '@/server/financeiro';
import {
  consumirRateLimit,
  hashRateLimit,
  ipDaRequisicao,
  LIMITES_RATE_LIMIT,
  respostaDeRateLimit,
} from '@/server/rate-limit';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limite = await consumirRateLimit(
    `pagamento:ip:${hashRateLimit(ipDaRequisicao(_request.headers))}`,
    LIMITES_RATE_LIMIT.pagamento,
  );
  if (!limite.permitido) return respostaDeRateLimit(limite);

  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) {
    return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  }

  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'FINANCEIRO');
    if (!acesso.ok) return acesso;
    return marcarParcelaPaga(contexto, numero);
  });
}
