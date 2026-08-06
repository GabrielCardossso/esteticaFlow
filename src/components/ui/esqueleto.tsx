import { cn } from '@/lib/utils';

export function Esqueleto({ className }: { className?: string | undefined }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-[var(--superficie-2)] varredura',
        className,
      )}
    />
  );
}

export function EsqueletoDeLista({ linhas = 5 }: { linhas?: number | undefined }) {
  return (
    <div className="space-y-2" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, indice) => (
        <Esqueleto key={indice} className="h-14 w-full" />
      ))}
    </div>
  );
}
