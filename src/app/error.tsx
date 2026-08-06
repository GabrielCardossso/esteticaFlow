'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[esteticaflow] erro na interface:', error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="superficie filete-acento max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-[var(--critico)]" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-[var(--tinta)]">
          Alguma coisa saiu do lugar
        </h1>
        <p className="mt-2 text-sm text-[var(--tinta-suave)]">
          O erro foi registrado. Tente novamente — se persistir, fale com o suporte.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-[var(--acento-ativo)] px-4 py-2.5 text-sm font-medium text-[var(--acento-texto)] transition-all hover:brightness-110"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
