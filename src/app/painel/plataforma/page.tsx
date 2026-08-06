import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { carregarContexto } from '@/auth/contexto';
import { ConsoleDaPlataforma } from '@/components/plataforma/console-da-plataforma';

export const metadata: Metadata = { title: 'Plataforma' };
export const dynamic = 'force-dynamic';

export default async function PaginaDaPlataforma() {
  const contexto = await carregarContexto();
  if (!contexto.ok || !contexto.value.usuario.ehSuperAdmin) redirect('/painel');
  return <ConsoleDaPlataforma />;
}
