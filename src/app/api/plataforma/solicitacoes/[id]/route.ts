import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { decidirSolicitacao } from '@/server/empresas';

export const runtime = 'nodejs';

const schema = z.object({
  aprovar: z.boolean(),
  motivo: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, schema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) =>
    decidirSolicitacao(contexto, numero, corpo.dados.aprovar, corpo.dados.motivo ?? null),
  );
}
