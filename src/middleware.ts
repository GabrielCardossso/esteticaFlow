import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO, lerSessao } from '@/auth/sessao';

const ROTAS_PUBLICAS = ['/', '/login', '/suporte', '/planos'];
const PREFIXOS_PUBLICOS = ['/api/auth/', '/_next/', '/favicon', '/imagens/'];

function ehPublica(pathname: string): boolean {
  if (ROTAS_PUBLICAS.includes(pathname)) return true;
  return PREFIXOS_PUBLICOS.some((prefixo) => pathname.startsWith(prefixo));
}

/**
 * Portao de borda: valida a assinatura do cookie e decide entre seguir,
 * mandar para o login ou tirar o usuario autenticado das telas publicas.
 * A revalidacao da assinatura da empresa acontece no runtime Node, onde o
 * banco esta disponivel.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessao = await lerSessao(request.cookies.get(COOKIE_SESSAO)?.value);
  const autenticado = sessao !== null;

  if (ehPublica(pathname)) {
    // O middleware so consegue validar a assinatura do JWT. A validade da
    // conta (usuario/empresa/plano) e confirmada no runtime Node pelo layout
    // do painel. Por isso, nunca redirecionamos /login apenas por haver um
    // cookie assinado: uma sessao revogada no banco entraria em loop entre
    // /login e /painel e impediria um novo login.
    if (autenticado && pathname === '/') {
      return NextResponse.redirect(new URL('/painel', request.url));
    }
    return NextResponse.next();
  }

  if (!autenticado) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada. Entre novamente.' } },
        { status: 401 },
      );
    }
    const destino = new URL('/login', request.url);
    destino.searchParams.set('proximo', `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
