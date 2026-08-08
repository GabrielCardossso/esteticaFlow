import { NextResponse } from 'next/server';
import { exigirRecurso } from '@/auth/contexto';
import { comContexto, lerId } from '@/server/api';
import { marcarParcelaPaga } from '@/server/financeiro';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
