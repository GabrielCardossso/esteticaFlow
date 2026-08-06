import { ok } from '@/domain/result';
import { comContexto } from '@/server/api';
import { listarFormasPagamento } from '@/server/financeiro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const todos = new URL(request.url).searchParams.get('todos') === 'true';
  return comContexto(async (contexto) => ok(await listarFormasPagamento(contexto, todos)));
}
