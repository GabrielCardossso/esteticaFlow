import { temaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { salvarTema } from '@/server/configuracoes';

export const runtime = 'nodejs';

export async function PUT(request: Request) {
  const corpo = await lerCorpo(request, temaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => salvarTema(contexto, corpo.dados));
}
