import type { Metadata } from 'next';
import { PainelDeEstoque } from '@/components/estoque/painel-de-estoque';

export const metadata: Metadata = { title: 'Estoque' };

export default function PaginaDeEstoque() {
  return <PainelDeEstoque />;
}
