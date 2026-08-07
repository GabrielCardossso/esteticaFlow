import { NextResponse } from 'next/server';
import { exigirRecurso } from '@/auth/contexto';
import { minimoEstoqueSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { alterarMinimo } from '@/server/estoque';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, minimoEstoqueSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return alterarMinimo(contexto, numero, corpo.dados.quantidadeMinima, corpo.dados.unidadeMinima);
  });
}
