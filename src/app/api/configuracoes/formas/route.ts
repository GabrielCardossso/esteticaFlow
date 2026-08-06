import { formaPagamentoSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { criarFormaPagamento } from '@/server/configuracoes';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, formaPagamentoSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => criarFormaPagamento(contexto, corpo.dados), 201);
}
