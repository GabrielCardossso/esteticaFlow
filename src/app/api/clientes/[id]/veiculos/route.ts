import { NextResponse } from 'next/server';
import { comContexto, lerId } from '@/server/api';
import { listarVeiculos } from '@/server/clientes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const incluirInativos = new URL(request.url).searchParams.get('todos') === 'true';
  return comContexto((contexto) => listarVeiculos(contexto, numero, incluirInativos));
}
