import { exigirRecurso } from '@/auth/contexto';
import { ok } from '@/domain/result';
import { comContexto } from '@/server/api';
import { listarMovimentacoes } from '@/server/estoque';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limite = Number(new URL(request.url).searchParams.get('limite') ?? 30);
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return ok(await listarMovimentacoes(contexto, Number.isFinite(limite) ? limite : 30));
  });
}
