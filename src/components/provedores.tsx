'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { FalhaDaApi } from '@/lib/api';

function criarCliente(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados operacionais mudam com frequência: 30s de frescor é o
        // equilíbrio entre não piscar a tela e não mostrar saldo velho.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (tentativa, erro) => {
          if (erro instanceof FalhaDaApi) {
            // Erro de regra de negócio não melhora com repetição.
            if (erro.status >= 400 && erro.status < 500) return false;
          }
          return tentativa < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function Provedores({ children }: { children: ReactNode }) {
  const [cliente] = useState(criarCliente);

  return (
    <QueryClientProvider client={cliente}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--superficie-2)',
            border: '1px solid var(--borda)',
            color: 'var(--tinta)',
          },
        }}
      />
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
