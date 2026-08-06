import type { Metadata } from 'next';
import { QuadroDaAgenda } from '@/components/agenda/quadro-da-agenda';

export const metadata: Metadata = { title: 'Agenda' };

export default function PaginaDaAgenda() {
  return <QuadroDaAgenda />;
}
