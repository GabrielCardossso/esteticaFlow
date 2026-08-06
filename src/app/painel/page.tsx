import type { Metadata } from 'next';
import { VisaoDoPainel } from '@/components/painel/visao-do-painel';

export const metadata: Metadata = { title: 'Painel' };

export default function PaginaDoPainel() {
  return <VisaoDoPainel />;
}
