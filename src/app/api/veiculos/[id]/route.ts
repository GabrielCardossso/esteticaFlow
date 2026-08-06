import { NextResponse } from 'next/server';
import { veiculoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarVeiculo } from '@/server/clientes';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, veiculoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => atualizarVeiculo(contexto, numero, corpo.dados));
}
