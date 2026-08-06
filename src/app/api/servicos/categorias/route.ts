import { categoriaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarCategoriaServico, listarCategoriasServico } from '@/server/servicos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const todos = new URL(request.url).searchParams.get('todos') === 'true';
  return comContexto((contexto) => listarCategoriasServico(contexto, todos));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, categoriaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarCategoriaServico(contexto, corpo.dados), 201);
}
