import { exigirRecurso } from '@/auth/contexto';
import { filtroFinanceiroSchema } from '@/schemas';
import { comContexto, lerQuery } from '@/server/api';
import { indicadores, listarLancamentos, listarParcelas } from '@/server/financeiro';
import { ok } from '@/domain/result';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroFinanceiroSchema);
  if (!query.ok) return query.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'FINANCEIRO');
    if (!acesso.ok) return acesso;
    const [lancamentos, indicadoresDoPeriodo, parcelas] = await Promise.all([
      listarLancamentos(contexto, query.dados),
      indicadores(contexto),
      listarParcelas(contexto),
    ]);
    if (!lancamentos.ok) return lancamentos;
    return ok({ ...lancamentos.value, indicadores: indicadoresDoPeriodo, parcelas });
  });
}
