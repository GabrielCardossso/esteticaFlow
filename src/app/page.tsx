import type { Metadata } from 'next';
import { ExperienciaEsteticaFlow } from '@/components/landing/experiencia-esteticaflow';

export const metadata: Metadata = {
  title: 'EsteticaFlow — gestão no ritmo da sua operação',
  description: 'Agenda, clientes, estoque e financeiro para estética automotiva em uma experiência de gestão clara, precisa e conectada.',
};

export default function PaginaInicial() {
  return <ExperienciaEsteticaFlow />;
}
