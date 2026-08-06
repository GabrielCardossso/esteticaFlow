import { exigirRecurso } from '@/auth/contexto';
import { produtoSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarProduto } from '@/server/estoque';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, produtoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return criarProduto(contexto, corpo.dados);
  }, 201);
}
