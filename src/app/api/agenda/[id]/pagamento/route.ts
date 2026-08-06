import { NextResponse } from 'next/server';
import { pagamentoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { registrarPagamento } from '@/server/agenda';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, pagamentoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => registrarPagamento(contexto, numero, corpo.dados.formaPagamentoId));
}
