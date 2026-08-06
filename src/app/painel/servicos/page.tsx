import type { Metadata } from 'next';
import { CatalogoDeServicos } from '@/components/servicos/catalogo-de-servicos';

export const metadata: Metadata = { title: 'Serviços' };

export default function PaginaDeServicos() {
  return <CatalogoDeServicos />;
}
