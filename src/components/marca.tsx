import { cn } from '@/lib/utils';

/**
 * Símbolo da marca: um velocímetro estilizado com a agulha na faixa de
 * trabalho. Desenhado em SVG para escalar sem perda e herdar o acento.
 */
export function Simbolo({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('size-8', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.28"
      />
      <path
        d="M4.6 21.4A13 13 0 0 1 16 3a13 13 0 0 1 11.4 18.4"
        stroke="var(--acento-ativo)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 16.5 22.5 10"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16.5" r="2.5" fill="var(--acento-ativo)" />
    </svg>
  );
}

export function Marca({
  className,
  compacta = false,
}: {
  className?: string | undefined;
  compacta?: boolean | undefined;
}) {
  return (
    <span className={cn('flex items-center gap-2.5 text-[var(--tinta)]', className)}>
      <Simbolo className={compacta ? 'size-7' : 'size-8'} />
      {!compacta ? (
        <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          Estetica<span className="text-[var(--acento-ativo)]">Flow</span>
        </span>
      ) : null}
    </span>
  );
}
