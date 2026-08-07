import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  Check,
  Gauge,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Marca, Simbolo } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { CATALOGO_PLANOS, ROTULO_RECURSO, type Recurso } from '@/domain/plano';
import { formatarMoeda } from '@/domain/shared/texto';

export const metadata: Metadata = {
  title: 'EsteticaFlow — o painel da sua estética automotiva',
};

const RECURSOS_VITRINE = [
  {
    icone: CalendarClock,
    titulo: 'Agenda que não deixa furar horário',
    texto:
      'Cada atendimento reserva a janela do profissional pelo tempo real dos serviços. Conflito de box aparece antes de virar cliente esperando na calçada.',
  },
  {
    icone: Users,
    titulo: 'Cliente e veículo com histórico',
    texto:
      'Placa, modelo, serviços já feitos e quanto cada cliente já deixou na sua operação. Quem sumiu há 90 dias aparece sinalizado para reativação.',
  },
  {
    icone: Boxes,
    titulo: 'Estoque com custo por embalagem',
    texto:
      'Você cadastra o preço do galão e o sistema calcula o custo por mililitro. Toda entrada vira despesa lançada, sem inflar o financeiro.',
  },
  {
    icone: Wallet,
    titulo: 'Financeiro que fecha',
    texto:
      'Receita entra quando o atendimento é pago, despesa entra quando o produto é comprado. Fluxo de caixa e margem calculados, não digitados.',
  },
  {
    icone: BarChart3,
    titulo: 'Relatórios em PDF e Excel',
    texto:
      'Fechamento por dia, semana, mês ou semestre. Ranking de serviços, despesa por categoria e o detalhe de cada lançamento.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Multiempresa com acesso separado',
    texto:
      'Cada empresa vê apenas os próprios dados. Perfis de administrador e funcionário com permissões distintas.',
  },
] as const;

const NUMEROS = [
  { rotulo: 'Serviços por atendimento', valor: 'Ilimitado' },
  { rotulo: 'Preço congelado na venda', valor: '100%' },
  { rotulo: 'Fuso da operação', valor: 'BRT' },
  { rotulo: 'Tolerância de assinatura', valor: '7 dias' },
] as const;

export default function PaginaInicial() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-[var(--borda)] bg-[var(--superficie-0)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Marca />
          <nav className="hidden items-center gap-6 text-sm text-[var(--tinta-suave)] md:flex">
            <a className="transition-colors hover:text-[var(--tinta)]" href="#recursos">
              Recursos
            </a>
            <a className="transition-colors hover:text-[var(--tinta)]" href="#planos">
              Planos
            </a>
            <Link className="transition-colors hover:text-[var(--tinta)]" href="/suporte">
              Suporte
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Botao comoFilho variante="fantasma" tamanho="pequeno">
              <Link href="/login">Entrar</Link>
            </Botao>
            <Botao comoFilho variante="acento" tamanho="pequeno">
              <a href="#planos">
                Ver planos
                <ArrowRight />
              </a>
            </Botao>
          </div>
        </div>
      </header>

      <main id="conteudo">
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden border-b border-[var(--borda)]">
          <div
            aria-hidden
            className="hero-aura pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-40"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, rgb(var(--acento-rgb) / 0.32), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="hero-entrada">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--borda-forte)] bg-[var(--superficie-2)] px-3 py-1 text-xs text-[var(--tinta-suave)]">
                  <Sparkles className="size-3.5 text-[var(--acento-ativo)]" aria-hidden />
                  Central de operação para estética automotiva
                </span>

                <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[var(--tinta)] sm:text-5xl lg:text-6xl">
                  Menos ruído na bancada.{' '}
                  <span className="text-[var(--acento-ativo)]">Mais carro entregue.</span>
                </h1>

                <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[var(--tinta-suave)]">
                  Agenda, clientes, veículos, estoque e financeiro trabalhando no ritmo da sua
                  operação. Você registra uma vez; o resto acompanha o serviço.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Botao comoFilho variante="acento" tamanho="grande">
                    <Link href="/login">
                      Acessar o sistema
                      <ArrowRight />
                    </Link>
                  </Botao>
                  <Botao comoFilho variante="contorno" tamanho="grande">
                    <a href="#recursos">Ver como funciona</a>
                  </Botao>
                </div>

                <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                  {NUMEROS.map((numero) => (
                    <div key={numero.rotulo}>
                      <dt className="rotulo-tecnico">{numero.rotulo}</dt>
                      <dd className="numerico mt-1 text-xl font-semibold text-[var(--tinta)]">
                        {numero.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Mock de painel: o produto se explicando visualmente. */}
              <div className="hero-painel hero-vitrine varredura-vitrine superficie filete-acento relative p-5">
                <div className="flex items-center justify-between">
                  <span className="rotulo-tecnico">Centro de comando · agora</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--positivo)]">
                    <span className="size-1.5 rounded-full bg-[var(--positivo)] luz-viva" />
                    operação fluindo
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="hero-kpi superficie-2 p-3.5">
                    <span className="rotulo-tecnico">Faturamento em curso</span>
                    <p className="numerico mt-1.5 text-2xl font-semibold text-[var(--tinta)]">
                      R$ 48.320
                    </p>
                    <span className="text-xs text-[var(--positivo)]">+18,4% no comparativo</span>
                  </div>
                  <div className="hero-kpi superficie-2 p-3.5">
                    <span className="rotulo-tecnico">Próxima entrega</span>
                    <p className="numerico mt-1.5 text-2xl font-semibold text-[var(--tinta)]">
                      11:30
                    </p>
                    <span className="text-xs text-[var(--tinta-suave)]">Polimento 2 etapas</span>
                  </div>
                </div>

                <div className="superficie-2 mt-3 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="rotulo-tecnico">Ocupação da semana</span>
                    <span className="numerico text-xs text-[var(--acento-ativo)]">82%</span>
                  </div>
                  <div className="mt-3 flex h-20 items-end gap-1.5">
                    {[42, 64, 51, 88, 73, 96, 58].map((altura, indice) => (
                      <div
                        key={indice}
                        className="barra-telemetria flex-1 rounded-sm"
                        style={{
                          height: `${altura}%`,
                          animationDelay: `${180 + indice * 70}ms`,
                          background:
                            altura > 85
                              ? 'var(--acento-ativo)'
                              : 'color-mix(in srgb, var(--acento-ativo) 32%, transparent)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[var(--tinta-tenue)]">
                    {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((dia) => (
                      <span key={dia}>{dia}</span>
                    ))}
                  </div>
                </div>

                <div className="superficie-2 mt-3 divide-y divide-[var(--borda)]">
                  {[
                    { hora: '09:00', cliente: 'Carlos Menezes', servico: 'Vitrificação 3 anos' },
                    { hora: '11:30', cliente: 'Marina Rocha', servico: 'Polimento 2 etapas' },
                    { hora: '14:00', cliente: 'Frota Vega', servico: 'Lavagem técnica' },
                  ].map((item) => (
                    <div key={item.hora} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="numerico text-sm text-[var(--acento-ativo)]">
                        {item.hora}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--tinta)]">{item.cliente}</p>
                        <p className="truncate text-xs text-[var(--tinta-tenue)]">{item.servico}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-[var(--borda)] py-20">
          <div className="revelar-na-rolagem mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="rotulo-tecnico">O problema</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
                Caderno, grupo de WhatsApp e memória não escalam
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--tinta-suave)]">
                Horário duplicado, cliente esquecido, produto que acabou no meio do serviço e um
                fechamento de mês que nunca bate. Não é falta de esforço — é falta de um lugar onde
                a informação mora.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  antes: 'Dois carros marcados no mesmo box',
                  depois: 'A agenda bloqueia o conflito na hora de salvar',
                },
                {
                  antes: 'Ninguém sabe quanto sobrou no mês',
                  depois: 'Receita, despesa e margem calculadas sozinhas',
                },
                {
                  antes: 'Produto acabou no meio do polimento',
                  depois: 'Alerta de estoque mínimo antes de faltar',
                },
              ].map((item) => (
                <div key={item.antes} className="superficie p-5">
                  <p className="text-sm text-[var(--tinta-tenue)] line-through">{item.antes}</p>
                  <p className="mt-3 flex items-start gap-2 text-sm font-medium text-[var(--tinta)]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--positivo)]" aria-hidden />
                    {item.depois}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="recursos" className="border-b border-[var(--borda)] py-20">
          <div className="revelar-na-rolagem mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="rotulo-tecnico">Recursos</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
                Cada módulo alimenta o próximo
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--tinta-suave)]">
                Concluir um atendimento baixa o estoque consumido e lança a receita. Comprar produto
                lança a despesa. Nada é digitado duas vezes.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {RECURSOS_VITRINE.map(({ icone: Icone, titulo, texto }) => (
                <article
                  key={titulo}
                  className="cartao-vitrine superficie group p-6 hover:border-[var(--acento-ativo)]"
                >
                  <div className="grid size-11 place-items-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] transition-colors group-hover:border-[var(--acento-ativo)]">
                    <Icone className="size-5 text-[var(--acento-ativo)]" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[var(--tinta)]">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--tinta-suave)]">{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="planos" className="border-b border-[var(--borda)] py-20">
          <div className="revelar-na-rolagem mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="rotulo-tecnico">Planos</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
                Preço fechado, sem taxa por atendimento
              </h2>
              <p className="mt-4 text-lg text-[var(--tinta-suave)]">
                Comece organizando a agenda. Suba de plano quando precisar de estoque e financeiro.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {(['BASICO', 'COMPLETO'] as const).map((chave) => {
                const plano = CATALOGO_PLANOS[chave];
                const recomendado = chave === 'COMPLETO';
                return (
                  <div
                    key={chave}
                    className={
                      recomendado
                        ? 'superficie filete-acento relative p-7 ring-1 ring-[var(--acento-ativo)]'
                        : 'superficie p-7'
                    }
                  >
                    {recomendado ? (
                      <span className="absolute -top-3 right-6 rounded-full bg-[var(--acento-ativo)] px-3 py-1 text-xs font-semibold text-[var(--acento-texto)]">
                        Mais escolhido
                      </span>
                    ) : null}

                    <h3 className="text-xl font-semibold text-[var(--tinta)]">{plano.nome}</h3>
                    <p className="mt-1.5 text-sm text-[var(--tinta-suave)]">{plano.descricao}</p>

                    <p className="mt-6 flex items-baseline gap-1.5">
                      <span className="numerico text-4xl font-bold text-[var(--tinta)]">
                        {formatarMoeda(plano.valorMensalPadrao)}
                      </span>
                      <span className="text-sm text-[var(--tinta-tenue)]">/mês</span>
                    </p>

                    <p className="mt-2 text-sm text-[var(--tinta-suave)]">
                      Até <strong className="text-[var(--tinta)]">{plano.limiteUsuarios}</strong>{' '}
                      {plano.limiteUsuarios === 1 ? 'usuário ativo' : 'usuários ativos'}
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {[...plano.recursos].map((recurso: Recurso) => (
                        <li key={recurso} className="flex items-start gap-2.5 text-sm">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-[var(--positivo)]"
                            aria-hidden
                          />
                          <span className="text-[var(--tinta-suave)]">
                            {ROTULO_RECURSO[recurso]}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Botao
                      comoFilho
                      variante={recomendado ? 'acento' : 'contorno'}
                      tamanho="grande"
                      className="mt-8 w-full"
                    >
                      <Link href="/suporte">Falar com a EsteticaFlow</Link>
                    </Botao>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-sm text-[var(--tinta-tenue)]">
              A troca de plano é feita pela EsteticaFlow a qualquer momento, sem perder histórico.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="py-20">
          <div className="revelar-na-rolagem mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Gauge className="mx-auto size-10 text-[var(--acento-ativo)]" aria-hidden />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
              Ligue o painel da sua operação
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--tinta-suave)]">
              Em poucos minutos você tem clientes, serviços e agenda rodando. O histórico começa a
              trabalhar a favor no primeiro atendimento.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Botao comoFilho variante="acento" tamanho="grande">
                <Link href="/login">
                  Entrar no sistema
                  <ArrowRight />
                </Link>
              </Botao>
              <Botao comoFilho variante="contorno" tamanho="grande">
                <Link href="/suporte">Falar com o suporte</Link>
              </Botao>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--borda)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5 text-sm text-[var(--tinta-tenue)]">
            <Simbolo className="size-6" />
            <span>EsteticaFlow · gestão para estética automotiva</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-[var(--tinta-tenue)]">
            <Link className="transition-colors hover:text-[var(--tinta)]" href="/suporte">
              Suporte
            </Link>
            <Link className="transition-colors hover:text-[var(--tinta)]" href="/login">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
