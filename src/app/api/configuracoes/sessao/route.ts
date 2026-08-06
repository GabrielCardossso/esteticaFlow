import { sessaoSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { salvarSessao } from '@/server/configuracoes';

export const runtime = 'nodejs';

export async function PUT(request: Request) {
  const corpo = await lerCorpo(request, sessaoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => salvarSessao(contexto, corpo.dados));
}
