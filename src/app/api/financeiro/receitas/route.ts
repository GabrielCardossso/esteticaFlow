import { exigirRecurso } from '@/auth/contexto';
import { receitaAvulsaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { registrarReceitaAvulsa } from '@/server/financeiro';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, receitaAvulsaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'FINANCEIRO');
    if (!acesso.ok) return acesso;
    return registrarReceitaAvulsa(contexto, corpo.dados);
  }, 201);
}
