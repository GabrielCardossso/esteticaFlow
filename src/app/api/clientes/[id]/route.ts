import { NextResponse } from 'next/server';
import { clienteSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarCliente, obterCliente } from '@/server/clientes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  return comContexto((contexto) => obterCliente(contexto, numero));
}

export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, clienteSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => atualizarCliente(contexto, numero, corpo.dados));
}
