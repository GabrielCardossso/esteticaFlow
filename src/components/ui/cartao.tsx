import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Cartao({
  className,
  destaque = false,
  ...resto
}: HTMLAttributes<HTMLDivElement> & { destaque?: boolean }) {
  return (
    <div
      className={cn('superficie', destaque ? 'filete-acento' : undefined, className)}
      {...resto}
    />
  );
}

export function CartaoCabecalho({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: ReactNode;
  descricao?: ReactNode | undefined;
  acao?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--borda)] px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-[var(--tinta)]">{titulo}</h2>
        {descricao !== undefined ? (
          <p className="mt-0.5 text-sm text-[var(--tinta-suave)]">{descricao}</p>
        ) : null}
      </div>
      {acao !== undefined ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}

export function CartaoCorpo({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...resto} />;
}
