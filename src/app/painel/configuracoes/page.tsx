import type { Metadata } from 'next';
import { CentralDeConfiguracoes } from '@/components/configuracoes/central-de-configuracoes';

export const metadata: Metadata = { title: 'Configurações' };

export default function PaginaDeConfiguracoes() {
  return <CentralDeConfiguracoes />;
}
