import { exigirRecurso } from '@/auth/contexto';
import { ok } from '@/domain/result';
import { categoriaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarCategoriaProduto, listarCategoriasProduto } from '@/server/estoque';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const todos = new URL(request.url).searchParams.get('todos') === 'true';
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return ok(await listarCategoriasProduto(contexto, todos));
  });
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, categoriaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return criarCategoriaProduto(contexto, corpo.dados);
  }, 201);
}
