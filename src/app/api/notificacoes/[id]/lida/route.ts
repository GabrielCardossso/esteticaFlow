import { NextResponse } from 'next/server';
import { comContexto, lerId } from '@/server/api';
import { marcarComoLida } from '@/server/notificacoes';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  return comContexto((contexto) => marcarComoLida(contexto, numero));
}
