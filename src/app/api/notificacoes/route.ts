import { comContexto } from '@/server/api';
import { listarNotificacoes } from '@/server/notificacoes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return comContexto((contexto) => listarNotificacoes(contexto));
}
