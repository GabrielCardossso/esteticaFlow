import { NextResponse } from 'next/server';
import { carregarContexto } from '@/auth/contexto';
import { lerPreferencias } from '@/server/configuracoes';
import { contarNaoLidas } from '@/server/notificacoes';
import { respostaDeFalha } from '@/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const contexto = await carregarContexto();
  if (!contexto.ok) return respostaDeFalha(contexto.error);

  const [preferencias, naoLidas] = await Promise.all([
    lerPreferencias(contexto.value),
    contarNaoLidas(contexto.value),
  ]);

  return NextResponse.json({
    usuario: {
      id: contexto.value.usuario.usuarioId,
      nome: contexto.value.usuario.nome,
      email: contexto.value.usuario.email,
      papel: contexto.value.papel,
      ehSuperAdmin: contexto.value.usuario.ehSuperAdmin,
      ehAdministrador: contexto.value.usuario.ehAdministrador,
    },
    empresa: contexto.value.empresa,
    recursos: contexto.value.recursos,
    preferencias,
    notificacoesNaoLidas: naoLidas,
  });
}
