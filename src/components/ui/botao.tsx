'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const estilos = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-[var(--duracao-curta)] ease-[var(--ease-mecanico)] disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        acento:
          'bg-[var(--acento-ativo)] text-[var(--acento-texto)] shadow-[var(--sombra-painel)] hover:brightness-110',
        solido:
          'bg-[var(--superficie-inversa)] text-[var(--tinta-inversa)] hover:opacity-90',
        contorno:
          'border border-[var(--borda-forte)] bg-transparent text-[var(--tinta)] hover:bg-[var(--superficie-2)] hover:border-[var(--acento-ativo)]',
        suave:
          'bg-[var(--superficie-2)] text-[var(--tinta)] border border-[var(--borda)] hover:bg-[var(--superficie-3)]',
        fantasma: 'text-[var(--tinta-suave)] hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)]',
        critico:
          'bg-[var(--critico-fraco)] text-[var(--critico)] border border-[var(--critico)]/40 hover:bg-[var(--critico)] hover:text-white',
        elo: 'text-[var(--acento-ativo)] underline-offset-4 hover:underline',
      },
      tamanho: {
        pequeno: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        medio: 'h-10 px-4 text-sm [&_svg]:size-4',
        grande: 'h-12 px-6 text-base [&_svg]:size-5',
        icone: 'size-10 [&_svg]:size-4',
        iconePequeno: 'size-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variante: 'suave', tamanho: 'medio' },
  },
);

export interface PropsBotao
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof estilos> {
  comoFilho?: boolean;
  carregando?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, PropsBotao>(function Botao(
  { className, variante, tamanho, comoFilho = false, carregando = false, children, disabled, ...resto },
  ref,
) {
  const Componente = comoFilho ? Slot : 'button';
  return (
    <Componente
      ref={ref}
      className={cn(estilos({ variante, tamanho }), className)}
      disabled={disabled === true || carregando}
      {...resto}
    >
      {carregando ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Componente>
  );
});
