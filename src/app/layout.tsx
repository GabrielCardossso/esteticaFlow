import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Provedores } from '@/components/provedores';
import { ehModo, MODO_PADRAO } from '@/domain/tema';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EsteticaFlow — gestão para estética automotiva',
    template: '%s · EsteticaFlow',
  },
  description:
    'Agenda, clientes, estoque, financeiro e relatórios da sua estética automotiva em um só painel. Feito para quem trabalha com carro.',
  applicationName: 'EsteticaFlow',
  authors: [{ name: 'EsteticaFlow' }],
  keywords: [
    'estética automotiva',
    'lava-rápido',
    'detailing',
    'gestão',
    'agenda',
    'ERP automotivo',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'EsteticaFlow',
    title: 'EsteticaFlow — gestão para estética automotiva',
    description:
      'Agenda, clientes, estoque, financeiro e relatórios em um só painel. Feito para quem trabalha com carro.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0c10' },
    { media: '(prefers-color-scheme: light)', color: '#f4f6f8' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * As fontes são carregadas em runtime pelo navegador, não no build. Isso mantém
 * o build reprodutível em ambientes sem acesso ao Google Fonts, e a pilha de
 * fallback do sistema segura a interface enquanto elas chegam.
 */
const FONTES_GOOGLE =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';

export default async function LayoutRaiz({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const preferido = jar.get('esteticaflow_modo')?.value;
  const modo = ehModo(preferido) && preferido !== 'sistema' ? preferido : MODO_PADRAO;

  return (
    <html lang="pt-BR" data-modo={modo} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTES_GOOGLE} />
      </head>
      <body data-textura="painel">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--acento-ativo)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--acento-texto)]"
        >
          Pular para o conteúdo
        </a>
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}
