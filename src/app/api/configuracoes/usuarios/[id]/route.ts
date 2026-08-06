import { NextResponse } from 'next/server';
import { usuarioSchema } from '@/schemas';
import { comContexto, lerCorpo, lerId } from '@/server/api';
import { atualizarUsuario } from '@/server/configuracoes';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = lerId(id);
  if (numero === null) return NextResponse.json({ erro: { mensagem: 'Id inválido.' } }, { status: 400 });
  const corpo = await lerCorpo(request, usuarioSchema);
  if (!corpo.ok) return corpo.resposta;
  return comContexto((contexto) => atualizarUsuario(contexto, numero, corpo.dados));
}
