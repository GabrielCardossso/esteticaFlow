import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { alternarCategoriaProdutoAtiva } from '@/server/estoque';

export const runtime = 'nodejs';

const schema = z.object({ ativo: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, schema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => alternarCategoriaProdutoAtiva(contexto, numero, corpo.dados.ativo));
}
