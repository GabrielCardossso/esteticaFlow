'use client';

import { tokensDeAcento, type ModoTema } from '@/domain/tema';

interface TemaDoCliente {
  hex: string;
  modo: ModoTema;
}

/**
 * Atualiza os tokens visuais sem depender de uma recarga completa da página.
 * O seletor aponta para o contêiner do tenant, onde os tokens do servidor
 * também são aplicados inicialmente.
 */
export function aplicarTemaNoDocumento({ hex, modo }: TemaDoCliente): void {
  if (typeof document === 'undefined') return;

  const contenedor =
    document.querySelector<HTMLElement>('[data-tema-tenant]') ?? document.documentElement;

  for (const [token, valor] of Object.entries(tokensDeAcento(hex))) {
    contenedor.style.setProperty(token, valor);
  }

  const modoResolvido =
    modo === 'sistema'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'claro'
        : 'escuro'
      : modo;

  document.documentElement.dataset.modo = modoResolvido;
  document.cookie = `esteticaflow_modo=${modoResolvido}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
