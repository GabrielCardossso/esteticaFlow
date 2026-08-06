import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const estilos = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tom: {
        neutro: 'border-[var(--borda-forte)] bg-[var(--superficie-2)] text-[var(--tinta-suave)]',
        acento: 'border-transparent bg-[var(--acento-fraco)] text-[var(--acento-ativo)]',
        positivo: 'border-transparent bg-[var(--positivo-fraco)] text-[var(--positivo)]',
        atencao: 'border-transparent bg-[var(--atencao-fraco)] text-[var(--atencao)]',
        critico: 'border-transparent bg-[var(--critico-fraco)] text-[var(--critico)]',
        informativo: 'border-transparent bg-[var(--informativo-fraco)] text-[var(--informativo)]',
      },
    },
    defaultVariants: { tom: 'neutro' },
  },
);

export type TomEtiqueta = NonNullable<VariantProps<typeof estilos>['tom']>;

export function Etiqueta({
  className,
  tom,
  ...resto
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof estilos>) {
  return <span className={cn(estilos({ tom }), className)} {...resto} />;
}

/** Ponto luminoso, como uma luz de painel acesa. */
export function Luz({ tom = 'neutro', pulsando = false }: { tom?: TomEtiqueta | undefined; pulsando?: boolean | undefined }) {
  const cores: Record<TomEtiqueta, string> = {
    neutro: 'bg-[var(--tinta-tenue)]',
    acento: 'bg-[var(--acento-ativo)]',
    positivo: 'bg-[var(--positivo)]',
    atencao: 'bg-[var(--atencao)]',
    critico: 'bg-[var(--critico)]',
    informativo: 'bg-[var(--informativo)]',
  };
  return (
    <span
      aria-hidden
      className={cn('size-1.5 rounded-full', cores[tom], pulsando ? 'luz-viva' : undefined)}
    />
  );
}
