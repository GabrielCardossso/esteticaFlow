import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Marca } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';

export const metadata: Metadata = {
  title: 'Suporte',
  description: 'Canais de atendimento da EsteticaFlow.',
};

const CANAIS = [
  {
    icone: MessageCircle,
    titulo: 'WhatsApp',
    descricao: 'Atendimento de segunda a sexta, das 9h às 18h.',
    acao: 'Abrir conversa',
    href: 'https://wa.me/5548991746960',
  },
  {
    icone: Mail,
    titulo: 'E-mail',
    descricao: 'Para dúvidas de cadastro, plano e faturamento.',
    acao: 'contato@esteticaflow.com.br',
    href: 'mailto:contato@esteticaflow.com.br',
  },
  {
    icone: Phone,
    titulo: 'Telefone',
    descricao: 'Suporte por voz em horário comercial.',
    acao: '(48) 99174-6960',
    href: 'tel:+5548991746960',
  },
] as const;

const DUVIDAS = [
  {
    pergunta: 'Esqueci minha senha. O que faço?',
    resposta:
      'A redefinição é feita pelo administrador da sua empresa, em Configurações › Usuários. Se você é o administrador, fale com a EsteticaFlow por um dos canais acima.',
  },
  {
    pergunta: 'Minha empresa apareceu como bloqueada.',
    resposta:
      'O acesso é suspenso após mais de 7 dias de atraso na assinatura. Regularize o pagamento e o acesso é liberado no mesmo dia.',
  },
  {
    pergunta: 'Preciso de estoque e financeiro. Como habilito?',
    resposta:
      'Esses módulos fazem parte do plano Completo. A troca de plano é feita pela EsteticaFlow e não faz você perder nenhum histórico.',
  },
  {
    pergunta: 'Como altero os dados cadastrais da empresa?',
    resposta:
      'Em Configurações › Empresa, o administrador envia uma solicitação. Como são dados fiscais, a alteração passa por conferência antes de ser aplicada.',
  },
] as const;

export default function PaginaDeSuporte() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--borda)]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Marca />
          <Botao comoFilho variante="fantasma" tamanho="pequeno">
            <Link href="/">
              <ArrowLeft />
              Voltar
            </Link>
          </Botao>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
          Como podemos ajudar?
        </h1>
        <p className="mt-3 max-w-xl text-lg text-[var(--tinta-suave)]">
          Fale com quem conhece o sistema e o dia a dia de uma estética automotiva.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {CANAIS.map(({ icone: Icone, titulo, descricao, acao, href }) => (
            <Cartao key={titulo} className="p-5">
              <Icone className="size-5 text-[var(--acento-ativo)]" aria-hidden />
              <h2 className="mt-3.5 text-base font-semibold text-[var(--tinta)]">{titulo}</h2>
              <p className="mt-1.5 text-sm text-[var(--tinta-suave)]">{descricao}</p>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-block text-sm font-medium text-[var(--acento-ativo)] underline-offset-4 hover:underline"
              >
                {acao}
              </a>
            </Cartao>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--tinta)]">Dúvidas frequentes</h2>
          <dl className="mt-5 divide-y divide-[var(--borda)] border-y border-[var(--borda)]">
            {DUVIDAS.map((duvida) => (
              <div key={duvida.pergunta} className="py-5">
                <dt className="font-medium text-[var(--tinta)]">{duvida.pergunta}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--tinta-suave)]">
                  {duvida.resposta}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
