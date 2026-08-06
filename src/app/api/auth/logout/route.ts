import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_SESSAO, lerSessao } from '@/auth/sessao';
import { registrar } from '@/server/log';

export const runtime = 'nodejs';

export async function POST() {
  const jar = await cookies();
  const sessao = await lerSessao(jar.get(COOKIE_SESSAO)?.value);

  if (sessao !== null) {
    await registrar({
      empresaId: sessao.empresaId,
      usuarioId: sessao.usuarioId,
      acao: 'LOGOUT_REALIZADO',
    });
  }

  jar.delete(COOKIE_SESSAO);
  return NextResponse.json({ ok: true });
}
