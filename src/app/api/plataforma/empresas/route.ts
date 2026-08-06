import { filtroEmpresasSchema, novaEmpresaSchema } from '@/schemas';
import { comContexto, lerCorpo, lerQuery } from '@/server/api';
import { criarEmpresa, listarEmpresas } from '@/server/empresas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroEmpresasSchema);
  if (!query.ok) return query.resposta;
  return comContexto((contexto) => listarEmpresas(contexto, query.dados));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, novaEmpresaSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarEmpresa(contexto, corpo.dados), 201);
}
