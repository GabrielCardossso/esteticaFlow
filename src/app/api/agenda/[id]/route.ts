import { NextResponse } from 'next/server';
import { comContexto, lerId } from '@/server/api';
import { obterAgendamento } from '@/server/agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  return comContexto((contexto) => obterAgendamento(contexto, numero));
}
