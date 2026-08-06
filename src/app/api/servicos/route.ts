import { filtroServicosSchema, servicoSchema } from '@/schemas';
import { comContexto, lerCorpo, lerQuery } from '@/server/api';
import { criarServico, listarServicos } from '@/server/servicos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroServicosSchema);
  if (!query.ok) return query.resposta;
  return comContexto((contexto) => listarServicos(contexto, query.dados));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, servicoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarServico(contexto, corpo.dados), 201);
}
