import { NextResponse } from 'next/server';
import { bloqueioSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { bloquearEmpresa } from '@/server/empresas';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, bloqueioSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => bloquearEmpresa(contexto, numero, corpo.dados));
}
