import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioDeAgendamento } from '@/components/agenda/formulario-de-agendamento';
import { Esqueleto } from '@/components/ui/esqueleto';

export const metadata: Metadata = { title: 'Novo atendimento' };

export default function PaginaDeNovoAtendimento() {
  return (
    <Suspense fallback={<Esqueleto className="h-96 w-full" />}>
      <FormularioDeAgendamento />
    </Suspense>
  );
}
