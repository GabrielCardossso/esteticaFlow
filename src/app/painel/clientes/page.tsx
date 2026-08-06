import type { Metadata } from 'next';
import { ListaDeClientes } from '@/components/clientes/lista-de-clientes';

export const metadata: Metadata = { title: 'Clientes' };

export default function PaginaDeClientes() {
  return <ListaDeClientes />;
}
