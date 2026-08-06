import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Vazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string | undefined;
  acao?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full border border-[var(--borda)] bg-[var(--superficie-2)]">
        <Icone className="size-6 text-[var(--tinta-tenue)]" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-[var(--tinta)]">{titulo}</h3>
      {descricao !== undefined ? (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--tinta-suave)]">{descricao}</p>
      ) : null}
      {acao !== undefined ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}
