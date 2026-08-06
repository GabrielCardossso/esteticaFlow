import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FichaDoCliente } from '@/components/clientes/ficha-do-cliente';

export const metadata: Metadata = { title: 'Ficha do cliente' };

export default async function PaginaDaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <FichaDoCliente id={numero} />;
}
