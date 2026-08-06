import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FormularioDeLogin } from '@/components/autenticacao/formulario-de-login';
import { Marca } from '@/components/marca';
import { Esqueleto } from '@/components/ui/esqueleto';

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
};

export default function PaginaDeLogin() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel lateral: contexto de marca, sem competir com o formulário. */}
      <aside className="relative hidden overflow-hidden border-r border-[var(--borda)] lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(70% 50% at 30% 20%, rgb(var(--acento-rgb) / 0.22), transparent 70%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Marca />
          <div className="max-w-md">
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-[var(--tinta)]">
              O painel da sua estética automotiva
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--tinta-suave)]">
              Agenda, clientes, estoque e financeiro conversando entre si — para você olhar o carro,
              não a planilha.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-6">
              {[
                { rotulo: 'Fuso da operação', valor: 'America/São_Paulo' },
                { rotulo: 'Preço na venda', valor: 'Congelado' },
                { rotulo: 'Dados por empresa', valor: 'Isolados' },
                { rotulo: 'Sessão', valor: 'Criptografada' },
              ].map((item) => (
                <div key={item.rotulo}>
                  <dt className="rotulo-tecnico">{item.rotulo}</dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--tinta)]">{item.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-xs text-[var(--tinta-tenue)]">
            EsteticaFlow · todos os direitos reservados
          </p>
        </div>
      </aside>

      <main id="conteudo" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Marca />
          </div>

          <h2 className="mt-8 text-2xl font-bold tracking-tight text-[var(--tinta)] lg:mt-0">
            Entrar na sua conta
          </h2>
          <p className="mt-1.5 text-sm text-[var(--tinta-suave)]">
            Use o e-mail cadastrado pela sua empresa.
          </p>

          <Suspense fallback={<Esqueleto className="mt-8 h-64 w-full" />}>
            <FormularioDeLogin />
          </Suspense>

          <p className="mt-8 text-center text-sm text-[var(--tinta-suave)]">
            Não tem acesso?{' '}
            <Link
              href="/suporte"
              className="font-medium text-[var(--acento-ativo)] underline-offset-4 hover:underline"
            >
              Fale com o suporte
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
