import { exigirRecurso } from '@/auth/contexto';
import { despesaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { registrarDespesa } from '@/server/financeiro';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, despesaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto(async (contexto) => {
    const acesso = exigirRecurso(contexto, 'FINANCEIRO');
    if (!acesso.ok) return acesso;
    return registrarDespesa(contexto, corpo.dados);
  }, 201);
}
