import type { Metadata } from 'next';
import { CentralDeRelatorios } from '@/components/relatorios/central-de-relatorios';

export const metadata: Metadata = { title: 'Relatórios' };

export default function PaginaDeRelatorios() {
  return <CentralDeRelatorios />;
}
