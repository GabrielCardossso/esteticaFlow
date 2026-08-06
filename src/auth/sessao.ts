import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import type { Papel } from '@/domain/plano';

export const COOKIE_SESSAO = 'esteticaflow_sessao';

const DURACAO_PADRAO_SEGUNDOS = 60 * 60 * 12; // 12 horas
const DURACAO_LEMBRAR_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

const conteudoSessaoSchema = z.object({
  usuarioId: z.number().int().positive(),
  empresaId: z.number().int().positive(),
  papel: z.enum(['SUPER_ADMIN', 'ADMINISTRADOR', 'FUNCIONARIO']),
  nome: z.string(),
  email: z.string(),
});

export type ConteudoSessao = z.infer<typeof conteudoSessaoSchema>;

function segredo(): Uint8Array {
  const valor = process.env.SESSION_SECRET;
  if (typeof valor !== 'string' || valor.length < 32) {
    throw new Error('SESSION_SECRET ausente ou muito curto (mínimo 32 caracteres).');
  }
  return new TextEncoder().encode(valor);
}

export async function assinarSessao(
  conteudo: ConteudoSessao,
  lembrar: boolean,
): Promise<{ token: string; maxAge: number }> {
  const maxAge = lembrar ? DURACAO_LEMBRAR_SEGUNDOS : DURACAO_PADRAO_SEGUNDOS;
  const token = await new SignJWT({ ...conteudo })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('esteticaflow')
    .setAudience('esteticaflow-app')
    .setExpirationTime(`${maxAge}s`)
    .sign(segredo());
  return { token, maxAge };
}

export async function lerSessao(token: string | undefined): Promise<ConteudoSessao | null> {
  if (typeof token !== 'string' || token === '') return null;
  try {
    const { payload } = await jwtVerify(token, segredo(), {
      issuer: 'esteticaflow',
      audience: 'esteticaflow-app',
    });
    const analisado = conteudoSessaoSchema.safeParse(payload);
    return analisado.success ? analisado.data : null;
  } catch {
    return null;
  }
}

export function opcoesDoCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export interface UsuarioDaSessao extends ConteudoSessao {
  readonly ehSuperAdmin: boolean;
  readonly ehAdministrador: boolean;
}

export function enriquecer(conteudo: ConteudoSessao): UsuarioDaSessao {
  const papel: Papel = conteudo.papel;
  return {
    ...conteudo,
    ehSuperAdmin: papel === 'SUPER_ADMIN',
    ehAdministrador: papel === 'SUPER_ADMIN' || papel === 'ADMINISTRADOR',
  };
}
