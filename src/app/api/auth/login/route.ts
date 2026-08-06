import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { assinarSessao, COOKIE_SESSAO, opcoesDoCookie } from '@/auth/sessao';
import { HTTP_POR_CODIGO } from '@/domain/result';
import { loginSchema } from '@/schemas';
import { lerCorpo, respostaDeErroInesperado } from '@/server/api';
import { autenticar, registrarAcesso } from '@/server/autenticacao';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const corpo = await lerCorpo(request, loginSchema);
    if (!corpo.ok) return corpo.resposta;

    const resultado = await autenticar(corpo.dados);
    if (!resultado.ok) {
      return NextResponse.json(
        { erro: resultado.error },
        { status: HTTP_POR_CODIGO[resultado.error.codigo] },
      );
    }

    const { token, maxAge } = await assinarSessao(resultado.value, corpo.dados.lembrar);
    const jar = await cookies();
    jar.set(COOKIE_SESSAO, token, opcoesDoCookie(maxAge));

    await registrarAcesso(resultado.value, request.headers);

    return NextResponse.json({ usuario: resultado.value });
  } catch (excecao) {
    return respostaDeErroInesperado(excecao);
  }
}
