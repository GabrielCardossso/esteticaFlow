import { NextResponse } from 'next/server';
import { exigirRecurso } from '@/auth/contexto';
import { entradaEstoqueSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { registrarEntrada } from '@/server/estoque';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, entradaEstoqueSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return registrarEntrada(contexto, numero, corpo.dados);
  });
}
