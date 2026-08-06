import { comContexto } from '@/server/api';
import { marcarTodasComoLidas } from '@/server/notificacoes';

export const runtime = 'nodejs';

export async function POST() {
  return comContexto((contexto) => marcarTodasComoLidas(contexto));
}
