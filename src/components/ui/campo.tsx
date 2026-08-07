'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { AlertCircle } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const BASE_CONTROLE =
  'w-full rounded-lg border bg-[var(--superficie-2)] px-3 text-sm text-[var(--tinta)] transition-colors duration-[var(--duracao-curta)] placeholder:text-[var(--tinta-tenue)] disabled:cursor-not-allowed disabled:opacity-50 border-[var(--borda)] hover:border-[var(--borda-forte)] focus:border-[var(--acento-ativo)] focus:outline-none focus:ring-2 focus:ring-[var(--acento-fraco)]';

export function Rotulo({
  children,
  obrigatorio = false,
  ...resto
}: LabelPrimitive.LabelProps & { obrigatorio?: boolean }) {
  return (
    <LabelPrimitive.Root
      className="flex items-center gap-1 text-sm font-medium text-[var(--tinta-suave)]"
      {...resto}
    >
      {children}
      {obrigatorio ? (
        <span aria-hidden className="text-[var(--critico)]">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export function MensagemDeErro({ children }: { children?: ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs text-[var(--critico)]">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

interface PropsComuns {
  rotulo?: string | undefined;
  ajuda?: string | undefined;
  erro?: string | undefined;
  obrigatorio?: boolean | undefined;
  className?: string | undefined;
}

export const Campo = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & PropsComuns & { prefixo?: ReactNode }
>(function Campo({ rotulo, ajuda, erro, obrigatorio, className, prefixo, ...resto }, ref) {
  const idGerado = useId();
  const id = resto.id ?? idGerado;

  return (
    <div className={cn('space-y-1.5', className)}>
      {rotulo !== undefined ? (
        <Rotulo htmlFor={id} obrigatorio={obrigatorio ?? false}>
          {rotulo}
        </Rotulo>
      ) : null}
      <div className="relative">
        {prefixo !== undefined ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--tinta-tenue)]">
            {prefixo}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          aria-invalid={erro !== undefined}
          aria-describedby={erro !== undefined ? `${id}-erro` : undefined}
          className={cn(
            BASE_CONTROLE,
            'h-10',
            prefixo !== undefined ? 'pl-9' : undefined,
            erro !== undefined
              ? 'border-[var(--critico)] focus:border-[var(--critico)]'
              : undefined,
          )}
          {...resto}
        />
      </div>
      {ajuda !== undefined && erro === undefined ? (
        <p className="text-xs text-[var(--tinta-tenue)]">{ajuda}</p>
      ) : null}
      <div id={`${id}-erro`}>
        <MensagemDeErro>{erro}</MensagemDeErro>
      </div>
    </div>
  );
});

export const AreaDeTexto = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & PropsComuns
>(function AreaDeTexto({ rotulo, ajuda, erro, obrigatorio, className, ...resto }, ref) {
  const idGerado = useId();
  const id = resto.id ?? idGerado;

  return (
    <div className={cn('space-y-1.5', className)}>
      {rotulo !== undefined ? (
        <Rotulo htmlFor={id} obrigatorio={obrigatorio ?? false}>
          {rotulo}
        </Rotulo>
      ) : null}
      <textarea
        ref={ref}
        id={id}
        rows={3}
        aria-invalid={erro !== undefined}
        className={cn(
          BASE_CONTROLE,
          'resize-y py-2.5 leading-relaxed',
          erro !== undefined ? 'border-[var(--critico)]' : undefined,
        )}
        {...resto}
      />
      {ajuda !== undefined && erro === undefined ? (
        <p className="text-xs text-[var(--tinta-tenue)]">{ajuda}</p>
      ) : null}
      <MensagemDeErro>{erro}</MensagemDeErro>
    </div>
  );
});

export const Selecao = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & PropsComuns
>(function Selecao({ rotulo, ajuda, erro, obrigatorio, className, children, ...resto }, ref) {
  const idGerado = useId();
  const id = resto.id ?? idGerado;

  return (
    <div className={cn('space-y-1.5', className)}>
      {rotulo !== undefined ? (
        <Rotulo htmlFor={id} obrigatorio={obrigatorio ?? false}>
          {rotulo}
        </Rotulo>
      ) : null}
      <select
        ref={ref}
        id={id}
        aria-invalid={erro !== undefined}
        className={cn(
          BASE_CONTROLE,
          'h-10 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 [&_option]:bg-[var(--superficie-2)] [&_option]:text-[var(--tinta)]',
          erro !== undefined ? 'border-[var(--critico)]' : undefined,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...resto}
      >
        {children}
      </select>
      {ajuda !== undefined && erro === undefined ? (
        <p className="text-xs text-[var(--tinta-tenue)]">{ajuda}</p>
      ) : null}
      <MensagemDeErro>{erro}</MensagemDeErro>
    </div>
  );
});

export function Alternador({
  marcado,
  aoMudar,
  rotulo,
  descricao,
  desabilitado = false,
}: {
  marcado: boolean;
  aoMudar: (valor: boolean) => void;
  rotulo: string;
  descricao?: string | undefined;
  desabilitado?: boolean | undefined;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--tinta)]">{rotulo}</span>
        {descricao !== undefined ? (
          <span className="mt-0.5 block text-xs text-[var(--tinta-suave)]">{descricao}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={marcado}
        aria-label={rotulo}
        disabled={desabilitado}
        onClick={() => aoMudar(!marcado)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--duracao-curta)] disabled:opacity-50',
          marcado
            ? 'border-transparent bg-[var(--acento-ativo)]'
            : 'border-[var(--borda-forte)] bg-[var(--superficie-3)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-[var(--duracao-curta)] ease-[var(--ease-mecanico)]',
            marcado ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}
