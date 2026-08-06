import { agendamentoSchema, filtroAgendaSchema } from '@/schemas';
import { comContexto, lerCorpo, lerQuery } from '@/server/api';
import { criarAgendamento, listarAgenda } from '@/server/agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroAgendaSchema);
  if (!query.ok) return query.resposta;
  return comContexto((contexto) => listarAgenda(contexto, query.dados));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, agendamentoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarAgendamento(contexto, corpo.dados), 201);
}
