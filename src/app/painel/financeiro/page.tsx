import type { Metadata } from 'next';
import { PainelFinanceiro } from '@/components/financeiro/painel-financeiro';

export const metadata: Metadata = { title: 'Financeiro' };

export default function PaginaFinanceira() {
  return <PainelFinanceiro />;
}
