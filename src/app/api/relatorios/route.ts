import { filtroRelatorioSchema } from '@/schemas';
import { comContexto, lerQuery } from '@/server/api';
import { montarRelatorio } from '@/server/relatorios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroRelatorioSchema);
  if (!query.ok) return query.resposta;
  return comContexto((contexto) => montarRelatorio(contexto, query.dados));
}
