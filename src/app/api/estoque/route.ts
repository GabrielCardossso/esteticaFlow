import { exigirRecurso } from '@/auth/contexto';
import { filtroEstoqueSchema } from '@/schemas';
import { comContexto, lerQuery } from '@/server/api';
import { listarEstoque } from '@/server/estoque';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroEstoqueSchema);
  if (!query.ok) return query.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'ESTOQUE');
    if (!acesso.ok) return acesso;
    return listarEstoque(contexto, query.dados);
  });
}
