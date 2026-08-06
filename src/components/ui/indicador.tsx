import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cartao } from './cartao';

export function Indicador({
  rotulo,
  valor,
  detalhe,
  variacao,
  icone: Icone,
  tom = 'neutro',
}: {
  rotulo: string;
  valor: string;
  detalhe?: string | undefined;
  variacao?: number | null | undefined;
  icone?: LucideIcon | undefined;
  tom?: 'neutro' | 'positivo' | 'critico' | 'acento' | undefined;
}) {
  const cores = {
    neutro: 'text-[var(--tinta)]',
    positivo: 'text-[var(--positivo)]',
    critico: 'text-[var(--critico)]',
    acento: 'text-[var(--acento-ativo)]',
  } as const;

  const subiu = typeof variacao === 'number' && variacao >= 0;

  return (
    <Cartao className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="rotulo-tecnico">{rotulo}</span>
        {Icone !== undefined ? (
          <Icone className="size-4 text-[var(--tinta-tenue)]" aria-hidden />
        ) : null}
      </div>
      <p className={cn('numerico ignicao mt-2 text-2xl font-semibold', cores[tom])}>{valor}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {typeof variacao === 'number' ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              subiu ? 'text-[var(--positivo)]' : 'text-[var(--critico)]',
            )}
          >
            {subiu ? (
              <TrendingUp className="size-3.5" aria-hidden />
            ) : (
              <TrendingDown className="size-3.5" aria-hidden />
            )}
            {subiu ? '+' : ''}
            {variacao}%
          </span>
        ) : null}
        {detalhe !== undefined ? (
          <span className="text-xs text-[var(--tinta-suave)]">{detalhe}</span>
        ) : null}
      </div>
    </Cartao>
  );
}

/** Medidor horizontal, no espírito de um marcador de combustível. */
export function Medidor({
  percentual,
  tom = 'acento',
  rotulo,
}: {
  percentual: number;
  tom?: 'acento' | 'positivo' | 'atencao' | 'critico' | undefined;
  rotulo?: string | undefined;
}) {
  const cores = {
    acento: 'bg-[var(--acento-ativo)]',
    positivo: 'bg-[var(--positivo)]',
    atencao: 'bg-[var(--atencao)]',
    critico: 'bg-[var(--critico)]',
  } as const;

  const valor = Math.max(0, Math.min(100, percentual));

  return (
    <div
      role="meter"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo ?? 'Nível'}
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--superficie-3)]"
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-[var(--duracao-media)] ease-[var(--ease-mecanico)]',
          cores[tom],
        )}
        style={{ width: `${valor}%` }}
      />
    </div>
  );
}
