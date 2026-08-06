import { NextResponse } from 'next/server';
import { servicoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarServico, obterServico } from '@/server/servicos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Rota = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Rota) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  return comContexto((contexto) => obterServico(contexto, numero));
}

export async function PUT(request: Request, { params }: Rota) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, servicoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => atualizarServico(contexto, numero, corpo.dados));
}
