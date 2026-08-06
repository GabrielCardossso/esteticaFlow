import { NextResponse } from 'next/server';
import { formaPagamentoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarFormaPagamento } from '@/server/configuracoes';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, formaPagamentoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => atualizarFormaPagamento(contexto, numero, corpo.dados));
}
