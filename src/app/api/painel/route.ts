import { comContexto } from '@/server/api';
import { montarPainel } from '@/server/painel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return comContexto((contexto) => montarPainel(contexto));
}
