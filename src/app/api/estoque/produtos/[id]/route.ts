import { NextResponse } from 'next/server';
import { exigirRecurso } from '@/auth/contexto';
import { produtoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarProduto, obterProduto } from '@/server/estoque';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Rota = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Rota) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return obterProduto(contexto, numero);
  });
}

export async function PUT(request: Request, { params }: Rota) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, produtoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return atualizarProduto(contexto, numero, corpo.dados);
  });
}
