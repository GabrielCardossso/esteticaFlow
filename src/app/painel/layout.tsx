import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { carregarContexto } from '@/auth/contexto';
import { Casca } from '@/components/painel/casca';
import { tokensDeAcento } from '@/domain/tema';
import { lerPreferencias } from '@/server/configuracoes';

export const dynamic = 'force-dynamic';

export default async function LayoutDoPainel({ children }: { children: ReactNode }) {
  const contexto = await carregarContexto();

  if (!contexto.ok) {
    const motivo = contexto.error.codigo === 'NAO_AUTENTICADO' ? 'sessao' : 'bloqueio';
    redirect(`/login?motivo=${motivo}`);
  }

  const preferencias = await lerPreferencias(contexto.value);

  // O acento do tenant entra como variável CSS: um único ponto de verdade
  // para toda a interface, já ajustado para contraste AA nos dois modos.
  const tokens = tokensDeAcento(preferencias.hex);

  return (
    <div style={tokens as React.CSSProperties} className="min-h-dvh">
      <Casca
        modoInicial={preferencias.modo}
        empresa={contexto.value.empresa.nomeFantasia}
        usuario={contexto.value.usuario.nome}
        papel={contexto.value.papel}
        recursos={[...contexto.value.recursos]}
        statusAssinatura={contexto.value.empresa.statusAssinatura}
        proximoVencimento={contexto.value.empresa.proximoVencimento}
        inatividadeAtiva={preferencias.inatividadeAtiva}
        inatividadeMinutos={preferencias.inatividadeMinutos}
      >
        {children}
      </Casca>
    </div>
  );
}
