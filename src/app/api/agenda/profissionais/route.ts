import { ok } from '@/domain/result';
import { comContexto } from '@/server/api';
import { listarProfissionais } from '@/server/agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return comContexto(async (contexto) => ok(await listarProfissionais(contexto)));
}
