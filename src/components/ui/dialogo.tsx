'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Dialogo({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'media',
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao?: string | undefined;
  children: ReactNode;
  rodape?: ReactNode | undefined;
  largura?: 'estreita' | 'media' | 'larga' | undefined;
}) {
  const larguras = {
    estreita: 'max-w-md',
    media: 'max-w-2xl',
    larga: 'max-w-4xl',
  } as const;

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-painel)] border border-[var(--borda)] bg-[var(--superficie-1)] shadow-[var(--sombra-elevada)] filete-acento',
            larguras[largura],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--borda)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-[var(--tinta)]">
                {titulo}
              </Dialog.Title>
              {descricao !== undefined ? (
                <Dialog.Description className="mt-0.5 text-sm text-[var(--tinta-suave)]">
                  {descricao}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="rounded-md p-1 text-[var(--tinta-tenue)] transition-colors hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {rodape !== undefined ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--borda)] bg-[var(--superficie-2)] px-5 py-3">
              {rodape}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const FecharDialogo = Dialog.Close;
