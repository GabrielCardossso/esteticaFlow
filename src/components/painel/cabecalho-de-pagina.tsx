import type { ReactNode } from 'react';

export function CabecalhoDePagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string | undefined;
  acao?: ReactNode | undefined;
}) {
  return (
    <header className="painel-cabecalho mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--tinta)]">
          <span
            className="h-6 w-1 shrink-0 rounded-full bg-[var(--acento-ativo)] shadow-[0_0_18px_rgb(var(--acento-rgb)/0.45)]"
            aria-hidden
          />
          {titulo}
        </h1>
        {descricao !== undefined ? (
          <p className="mt-1 text-sm text-[var(--tinta-suave)]">{descricao}</p>
        ) : null}
      </div>
      {acao !== undefined ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">{acao}</div>
      ) : null}
    </header>
  );
}

export function AvisoDePlano({ recurso }: { recurso: string }) {
  return (
    <div className="superficie flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h2 className="text-lg font-semibold text-[var(--tinta)]">
        {recurso} faz parte do plano Pro
      </h2>
      <p className="max-w-md text-sm text-[var(--tinta-suave)]">
        Fale com a EsteticaFlow para liberar este módulo. Seu histórico atual é preservado
        integralmente na troca de plano.
      </p>
    </div>
  );
}
