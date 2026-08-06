import { comContexto } from '@/server/api';
import { buscar } from '@/server/busca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const termo = new URL(request.url).searchParams.get('q') ?? '';
  return comContexto((contexto) => buscar(contexto, termo));
}
