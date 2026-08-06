import { comContexto } from '@/server/api';
import { listarSolicitacoesPendentes } from '@/server/empresas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return comContexto((contexto) => listarSolicitacoesPendentes(contexto));
}
