import { veiculoSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarVeiculo } from '@/server/clientes';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, veiculoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarVeiculo(contexto, corpo.dados), 201);
}
