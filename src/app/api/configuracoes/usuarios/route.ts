import { novoUsuarioSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarUsuario, listarUsuarios } from '@/server/configuracoes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const todos = new URL(request.url).searchParams.get('todos') === 'true';
  return comContexto((contexto) => listarUsuarios(contexto, todos));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, novoUsuarioSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarUsuario(contexto, corpo.dados), 201);
}
