import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetalheDoAtendimento } from '@/components/agenda/detalhe-do-atendimento';

export const metadata: Metadata = { title: 'Atendimento' };

export default async function PaginaDoAtendimento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <DetalheDoAtendimento id={numero} />;
}
