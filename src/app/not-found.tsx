import Link from 'next/link';

export default function NaoEncontradoGlobal() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="superficie max-w-md p-8 text-center">
        <p className="numerico text-5xl font-bold text-[var(--acento-ativo)]">404</p>
        <h1 className="mt-3 text-xl font-semibold text-[var(--tinta)]">Página não encontrada</h1>
        <p className="mt-2 text-sm text-[var(--tinta-suave)]">
          O endereço que você acessou não existe.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--acento-ativo)] px-4 py-2.5 text-sm font-medium text-[var(--acento-texto)] transition-all hover:brightness-110"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
