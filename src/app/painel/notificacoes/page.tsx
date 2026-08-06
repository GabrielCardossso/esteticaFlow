import type { Metadata } from 'next';
import { CaixaDeNotificacoes } from '@/components/notificacoes/caixa-de-notificacoes';

export const metadata: Metadata = { title: 'Notificações' };

export default function PaginaDeNotificacoes() {
  return <CaixaDeNotificacoes />;
}
