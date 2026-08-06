import { comContexto, lerCorpo, lerQuery } from '@/server/api';
import { clienteSchema, filtroClientesSchema } from '@/schemas';
import { criarCliente, listarClientes } from '@/server/clientes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroClientesSchema);
  if (!query.ok) return query.resposta;
  return comContexto((contexto) => listarClientes(contexto, query.dados));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, clienteSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarCliente(contexto, corpo.dados), 201);
}
