import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO, lerSessao } from '@/auth/sessao';

const ROTAS_PUBLICAS = ['/', '/login', '/suporte', '/planos'];
const PREFIXOS_PUBLICOS = ['/api/auth/', '/_next/', '/favicon', '/imagens/'];

type BaldeRateLimit = { quantidade: number; expiraEm: number };
const baldesRateLimit = new Map<string, BaldeRateLimit>();
const MAXIMO_BALDES_RATE_LIMIT = 2_000;

function ehPublica(pathname: string): boolean {
  if (ROTAS_PUBLICAS.includes(pathname)) return true;
  return PREFIXOS_PUBLICOS.some((prefixo) => pathname.startsWith(prefixo));
}

/** Escudo de rajada por instância; o contador persistente protege rotas críticas. */
function limitarRajada(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/') || request.method === 'OPTIONS') return null;

  const agora = Date.now();
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'desconhecido';
  const ehLogin = pathname === '/api/auth/login';
  const ehMutacao = !['GET', 'HEAD'].includes(request.method);
  const limite = ehLogin ? 20 : ehMutacao ? 120 : 300;
  const janelaMs = 60_000;
  const chave = `${ehLogin ? 'login' : ehMutacao ? 'mutacao' : 'consulta'}:${ip}`;
  const atual = baldesRateLimit.get(chave);

  for (const [chaveAntiga, balde] of baldesRateLimit) {
    if (balde.expiraEm <= agora) baldesRateLimit.delete(chaveAntiga);
  }
  if (baldesRateLimit.size >= MAXIMO_BALDES_RATE_LIMIT && atual === undefined) {
    const primeira = baldesRateLimit.keys().next().value;
    if (typeof primeira === 'string') baldesRateLimit.delete(primeira);
  }

  const balde =
    atual !== undefined && atual.expiraEm > agora
      ? atual
      : { quantidade: 0, expiraEm: agora + janelaMs };
  balde.quantidade += 1;
  baldesRateLimit.set(chave, balde);

  const restante = Math.max(0, limite - balde.quantidade);
  if (balde.quantidade <= limite) return null;

  const retryAfter = Math.max(1, Math.ceil((balde.expiraEm - agora) / 1000));
  return NextResponse.json(
    {
      erro: {
        codigo: 'MUITAS_REQUISICOES',
        mensagem: 'Muitas requisições. Aguarde alguns segundos.',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limite),
        'X-RateLimit-Remaining': String(restante),
      },
    },
  );
}

/**
 * Portao de borda: valida a assinatura do cookie e decide entre seguir,
 * mandar para o login ou tirar o usuario autenticado das telas publicas.
 * A revalidacao da assinatura da empresa acontece no runtime Node, onde o
 * banco esta disponivel.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const limite = limitarRajada(request);
  if (limite !== null) return limite;

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
