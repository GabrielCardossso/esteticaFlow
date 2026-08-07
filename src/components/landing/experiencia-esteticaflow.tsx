'use client';

import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Menu,
  PackageCheck,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Marca, Simbolo } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { CATALOGO_PLANOS, ROTULO_RECURSO, type Recurso } from '@/domain/plano';
import { formatarMoeda } from '@/domain/shared/texto';
import { cn } from '@/lib/utils';

const modulos = [
  { id: 'operacao', rotulo: 'Visão geral', icone: Gauge },
  { id: 'agenda', rotulo: 'Agenda', icone: CalendarDays },
  { id: 'financeiro', rotulo: 'Financeiro', icone: CircleDollarSign },
  { id: 'estoque', rotulo: 'Estoque', icone: Boxes },
] as const;

type Modulo = (typeof modulos)[number]['id'];

const servicos = [
  ['09:00', 'Renato Ferreira', 'Vitrificação premium', 'confirmado'],
  ['11:30', 'Marina Rocha', 'Polimento técnico', 'em andamento'],
  ['14:00', 'Lucas Vieira', 'Higienização interna', 'confirmado'],
] as const;

const recursos = [
  ['Agenda inteligente', 'O tempo do serviço vira o tempo real do seu dia.', CalendarDays],
  ['Cadastro que lembra', 'Cliente, veículo e histórico no mesmo lugar.', Users],
  ['Estoque consciente', 'Custo, consumo e alerta antes de faltar.', PackageCheck],
  ['Caixa com contexto', 'Receita e despesa ligadas ao que aconteceu.', CircleDollarSign],
] as const;

export function ExperienciaEsteticaFlow() {
  const [moduloAtivo, setModuloAtivo] = useState<Modulo>('operacao');
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-[#080a0f] text-[#edf1f7]">
      <div className="landing-ruido pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden />
      <header className="landing-nav fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="EsteticaFlow, início" className="relative z-10">
            <Marca />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[#a9b2c3] lg:flex" aria-label="Navegação da landing">
            <a href="#produto" className="landing-link">Produto</a>
            <a href="#operacao" className="landing-link">Como funciona</a>
            <a href="#planos" className="landing-link">Planos</a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/login" className="landing-link px-3 py-2 text-sm">Entrar</Link>
            <Botao comoFilho variante="acento" tamanho="medio" className="landing-cta-botao">
              <Link href="/suporte">Começar agora <ArrowRight /></Link>
            </Botao>
          </div>

          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white sm:hidden"
            aria-label={menuAberto ? 'Fechar navegação' : 'Abrir navegação'}
            onClick={() => setMenuAberto((atual) => !atual)}
          >
            {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuAberto ? (
          <div className="border-t border-white/10 bg-[#0d1017]/98 px-4 pb-5 pt-3 shadow-2xl backdrop-blur-xl sm:hidden">
            <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Navegação móvel">
              {[
                ['Produto', '#produto'], ['Como funciona', '#operacao'], ['Planos', '#planos'],
              ].map(([rotulo, href]) => (
                <a key={href} href={href} onClick={() => setMenuAberto(false)} className="rounded-xl px-4 py-3 text-sm text-[#cdd4e0] hover:bg-white/[0.06]">
                  {rotulo}
                </a>
              ))}
              <Link href="/login" className="rounded-xl px-4 py-3 text-sm text-[#cdd4e0] hover:bg-white/[0.06]">Entrar</Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="conteudo" className="relative z-10">
        <section className="relative isolate overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40 lg:pb-28">
          <div className="landing-orbita landing-orbita-um" aria-hidden />
          <div className="landing-orbita landing-orbita-dois" aria-hidden />
          <div className="landing-grade pointer-events-none absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="landing-selo landing-entrada">
                <span className="landing-selo-ponto" />
                Gestão feita para quem entrega carro, não planilha
              </p>
              <h1 className="landing-titulo landing-entrada mt-6 [animation-delay:80ms]">
                A sua operação merece<br className="hidden sm:block" /> um ritmo <span>impecável.</span>
              </h1>
              <p className="landing-subtitulo landing-entrada mx-auto mt-7 max-w-2xl [animation-delay:160ms]">
                Uma central de comando para agenda, clientes, estoque e financeiro se moverem juntos — com a precisão que o seu serviço pede.
              </p>
              <div className="landing-entrada mt-9 flex flex-wrap justify-center gap-3 [animation-delay:240ms]">
                <Botao comoFilho variante="acento" tamanho="grande" className="landing-cta-botao">
                  <Link href="/login">Conhecer o painel <ArrowRight /></Link>
                </Botao>
                <a href="#produto" className="landing-botao-secundario">Explorar a demonstração <ChevronRight className="size-4" /></a>
              </div>
              <div className="landing-entrada mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#8791a3] [animation-delay:320ms]">
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" /> Sem taxa por atendimento</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" /> Dados por empresa isolados</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" /> Acesso em qualquer tela</span>
              </div>
            </div>

            <div id="produto" className="landing-demo-wrap landing-entrada mx-auto mt-14 max-w-6xl [animation-delay:360ms] sm:mt-20">
              <div className="landing-demo-brilho" aria-hidden />
              <DemoNavegavel ativo={moduloAtivo} aoMudar={setModuloAtivo} />
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-white/[0.025] py-7">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-5 px-4 text-center sm:px-6 lg:justify-between lg:px-8">
            {[
              ['Tudo conectado', 'um registro alimenta o próximo'],
              ['Dados claros', 'sem depender de planilha paralela'],
              ['Do seu jeito', 'tema e permissões por empresa'],
              ['Pronto para crescer', 'histórico que vira decisão'],
            ].map(([titulo, texto]) => (
              <div key={titulo} className="min-w-[150px]">
                <p className="text-sm font-semibold text-[#e7ebf2]">{titulo}</p>
                <p className="mt-1 text-xs text-[#808ba0]">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="operacao" className="relative py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-20 lg:px-8">
            <div>
              <p className="landing-eyebrow">Uma única operação</p>
              <h2 className="landing-h2 mt-4">O dia anda.<br />O sistema acompanha.</h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-[#9ea8ba]">
                Cada clique tem consequência útil: um atendimento concluído atualiza o caixa; um produto consumido conversa com o estoque; o histórico fica pronto antes da próxima visita.
              </p>
              <a href="#planos" className="landing-link mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--acento-ativo)]">
                Ver o que cabe na sua operação <ArrowRight className="size-4" />
              </a>
            </div>
            <div className="landing-fluxo" aria-label="Fluxo integrado da operação">
              <div className="landing-fluxo-linha" aria-hidden />
              {[
                [CalendarDays, 'Agendamento', 'O box e o profissional entram no ritmo.'],
                [Users, 'Atendimento', 'O histórico do carro aparece na bancada.'],
                [Boxes, 'Consumo', 'O estoque registra o que saiu.'],
                [BarChart3, 'Resultado', 'A gestão enxerga o mês acontecendo.'],
              ].map(([Icone, titulo, texto], indice) => {
                const Icon = Icone as typeof CalendarDays;
                return (
                  <article key={titulo as string} className="landing-fluxo-item" style={{ animationDelay: `${indice * 90}ms` }}>
                    <div className="landing-fluxo-icone"><Icon className="size-5" /></div>
                    <div><h3>{titulo as string}</h3><p>{texto as string}</p></div>
                    <ChevronRight className="ml-auto size-4 text-[#596478]" aria-hidden />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-[#0c1018] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="landing-eyebrow">Detalhe que organiza</p>
              <h2 className="landing-h2 mt-4">Menos abas. Mais contexto.</h2>
              <p className="mt-5 text-[#9ea8ba]">As peças do painel foram desenhadas para deixar a leitura rápida e a próxima ação óbvia, inclusive quando o dia está cheio.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {recursos.map(([titulo, texto, Icone], indice) => {
                const Icon = Icone as typeof CalendarDays;
                return (
                  <article key={titulo as string} className={cn('landing-recurso group', indice === 0 ? 'md:col-span-2' : '')}>
                    <div className="landing-recurso-icone"><Icon className="size-5" /></div>
                    <div className="relative z-10 max-w-md">
                      <p className="landing-recurso-numero">0{indice + 1}</p>
                      <h3>{titulo as string}</h3>
                      <p>{texto as string}</p>
                    </div>
                    <ArrowRight className="landing-recurso-seta" aria-hidden />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planos" className="relative py-24 sm:py-32">
          <div className="landing-orbita landing-orbita-tres" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="landing-eyebrow">Planos simples</p>
              <h2 className="landing-h2 mt-4">Gestão boa não pode custar o lucro do mês.</h2>
              <p className="mt-5 text-[#9ea8ba]">Comece pela rotina. Quando a operação pedir mais, o painel cresce junto sem perder o histórico.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {(['BASICO', 'COMPLETO'] as const).map((chave) => {
                const plano = CATALOGO_PLANOS[chave];
                const destaque = chave === 'COMPLETO';
                return (
                  <article key={chave} className={cn('landing-plano', destaque && 'landing-plano-destaque')}>
                    {destaque ? <span className="landing-plano-selo"><Sparkles className="size-3.5" /> Mais escolhido</span> : null}
                    <p className="text-sm font-semibold text-[#eef2f8]">{plano.nome}</p>
                    <p className="mt-2 min-h-11 text-sm leading-relaxed text-[#99a4b5]">{plano.descricao}</p>
                    <div className="mt-7 flex items-end gap-2">
                      <span className="text-sm text-[#788499]">de <s>{formatarMoeda(plano.valorMensalTabela)}</s></span>
                      <span className="text-xs text-[#788499]">por</span>
                    </div>
                    <p className="mt-1"><span className="landing-preco">{formatarMoeda(plano.valorMensalPadrao)}</span><span className="ml-1 text-sm text-[#99a4b5]">/ mês</span></p>
                    <p className="mt-2 text-xs text-[#8791a3]">Até {plano.limiteUsuarios} {plano.limiteUsuarios === 1 ? 'usuário ativo' : 'usuários ativos'}</p>
                    <ul className="mt-7 space-y-3">
                      {[...plano.recursos].slice(0, 6).map((recurso: Recurso) => (
                        <li key={recurso} className="flex items-start gap-2.5 text-sm text-[#c5cdd9]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />{ROTULO_RECURSO[recurso]}</li>
                      ))}
                    </ul>
                    <Botao comoFilho tamanho="grande" variante={destaque ? 'acento' : 'contorno'} className="mt-9 w-full">
                      <Link href="/suporte">Quero este plano <ArrowRight /></Link>
                    </Botao>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-8 lg:pb-14">
          <div className="landing-cta-final mx-auto max-w-7xl overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="landing-cta-luz" aria-hidden />
            <Simbolo className="relative mx-auto size-11" />
            <h2 className="relative mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">Seu melhor atendimento começa antes do carro chegar.</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-[#b1bac9]">Coloque a operação em movimento, sem aumentar o ruído no seu dia.</p>
            <Botao comoFilho variante="acento" tamanho="grande" className="relative mt-8 landing-cta-botao">
              <Link href="/login">Acessar EsteticaFlow <ArrowRight /></Link>
            </Botao>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[#7e899b] sm:flex-row sm:items-center sm:justify-between">
          <Marca compacta />
          <p>EsteticaFlow · gestão que acompanha o seu serviço.</p>
          <Link href="/suporte" className="landing-link">Falar com suporte</Link>
        </div>
      </footer>
    </div>
  );
}

function DemoNavegavel({ ativo, aoMudar }: { ativo: Modulo; aoMudar: (modulo: Modulo) => void }) {
  return (
    <div className="landing-demo">
      <div className="landing-demo-topo">
        <div className="flex items-center gap-1.5" aria-hidden><span className="size-2 rounded-full bg-[#ff5f57]" /><span className="size-2 rounded-full bg-[#febc2e]" /><span className="size-2 rounded-full bg-[#28c840]" /></div>
        <div className="hidden max-w-56 flex-1 items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[10px] text-[#728096] sm:flex"><Search className="size-3" /> app.esteticaflow.com/painel</div>
        <span className="text-[10px] text-emerald-400">● AO VIVO</span>
      </div>
      <div className="grid min-h-[510px] lg:grid-cols-[172px_1fr]">
        <aside className="hidden border-r border-white/[0.08] bg-black/20 p-3 lg:block">
          <div className="mb-7 flex items-center gap-2 px-2 pt-1"><Simbolo className="size-5" /><span className="font-[family-name:var(--font-display)] text-base font-semibold">Lumen<span className="text-[var(--acento-ativo)]">Auto</span></span></div>
          <div className="space-y-1">
            {modulos.map(({ id, rotulo, icone: Icone }) => <button key={id} type="button" onClick={() => aoMudar(id)} className={cn('landing-demo-menu', ativo === id && 'landing-demo-menu-ativo')}><Icone className="size-3.5" />{rotulo}</button>)}
          </div>
          <div className="mt-9 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5"><p className="text-[10px] text-[#758197]">Agosto · operação</p><p className="mt-1 text-lg font-semibold text-white">82%</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-[var(--acento-ativo)]" /></div></div>
        </aside>
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs text-[#8a95a8]">Sexta-feira, 7 de agosto</p><h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">{modulos.find((item) => item.id === ativo)?.rotulo}</h3></div><div className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><Sparkles className="size-4 text-[var(--acento-ativo)]" /></div></div>
          <div className="lg:hidden"><div className="mb-5 flex gap-1 overflow-x-auto pb-1">{modulos.map(({ id, rotulo }) => <button key={id} onClick={() => aoMudar(id)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs', ativo === id ? 'bg-[var(--acento-ativo)] text-black' : 'bg-white/[0.06] text-[#9aa5b7]')}>{rotulo}</button>)}</div></div>
          {ativo === 'operacao' ? <VisaoGeral /> : null}
          {ativo === 'agenda' ? <VisaoAgenda /> : null}
          {ativo === 'financeiro' ? <VisaoFinanceira /> : null}
          {ativo === 'estoque' ? <VisaoEstoque /> : null}
        </div>
      </div>
    </div>
  );
}

function VisaoGeral() { return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{[['Receita do mês', 'R$ 15.384', '+ 12,8%', 'text-emerald-400'], ['Atendimentos pagos', '30', '7 hoje', 'text-[#b7c1d0]'], ['Estoque atento', '3 itens', 'reposição sugerida', 'text-amber-300']].map(([r,v,a,c]) => <div key={r} className="landing-demo-card"><p>{r}</p><strong>{v}</strong><span className={c}>{a}</span></div>)}</div><div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><div className="landing-demo-card min-h-56"><div className="flex items-center justify-between"><p>Faturamento · últimos 7 dias</p><TrendingUp className="size-4 text-emerald-400" /></div><div className="mt-8 flex h-28 items-end gap-2">{[42,62,51,76,64,90,78].map((h,i) => <div key={i} className="landing-grafico-barra flex-1" style={{height:`${h}%`, animationDelay:`${i * 70}ms`}} />)}</div><div className="mt-2 flex justify-between text-[10px] text-[#687489]"><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span><span>dom</span></div></div><div className="landing-demo-card"><p>Próxima entrega</p><div className="mt-5 rounded-lg border border-[var(--acento-ativo)]/25 bg-[var(--acento-ativo)]/10 p-3"><span className="text-xs text-[var(--acento-ativo)]">11:30 · EM ANDAMENTO</span><strong className="mt-2 block text-sm">Polimento técnico</strong><span className="mt-1 block text-xs text-[#96a2b4]">Marina Rocha · Civic Touring</span></div></div></div></div> }
function VisaoAgenda() { return <div className="landing-demo-card"><div className="flex items-center justify-between"><p>Hoje · 7 de agosto</p><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-400">3 confirmados</span></div><div className="mt-5 divide-y divide-white/[0.07]">{servicos.map(([hora,cliente,servico,status]) => <div key={hora} className="flex items-center gap-3 py-3"><span className="w-10 font-[family-name:var(--font-display)] text-base text-[var(--acento-ativo)]">{hora}</span><span className="size-2 rounded-full bg-emerald-400" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{cliente}</strong><span className="block truncate text-xs text-[#8390a4]">{servico}</span></div><span className="hidden text-[10px] text-[#778398] sm:block">{status}</span></div>)}</div></div> }
function VisaoFinanceira() { return <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="landing-demo-card"><p>Resultado do mês</p><strong className="mt-3 block text-4xl">R$ 7.220</strong><span className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="size-3.5" /> margem positiva de 46,9%</span><div className="mt-8 space-y-3">{[['Receitas', 'R$ 15.384', 'w-full bg-emerald-400'], ['Despesas', 'R$ 8.164', 'w-[54%] bg-[#8894a9]']].map(([r,v,c]) => <div key={r}><div className="flex justify-between text-xs"><span className="text-[#8b96a9]">{r}</span><span>{v}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/10"><div className={cn('h-full rounded-full',c)} /></div></div>)}</div></div><div className="landing-demo-card"><p>Entradas recentes</p><div className="mt-5 space-y-4">{[['Vitrificação premium','R$ 1.490'],['Polimento técnico','R$ 680'],['Lavagem detalhada','R$ 260']].map(([r,v]) => <div key={r} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate text-[#bac3d0]">{r}</span><strong className="shrink-0 text-emerald-400">{v}</strong></div>)}</div></div></div> }
function VisaoEstoque() { return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{[['Itens ativos','24'],['Estoque saudável','21'],['Para repor','3']].map(([r,v]) => <div key={r} className="landing-demo-card"><p>{r}</p><strong className="mt-2 block text-2xl">{v}</strong></div>)}</div><div className="landing-demo-card"><p>Produtos que merecem atenção</p><div className="mt-4 space-y-3">{[['Shampoo neutro','550 ml','mín. 500 ml','bg-emerald-400'],['Cera sintética','280 g','mín. 350 g','bg-amber-300'],['Pano de microfibra','8 un','mín. 12 un','bg-amber-300']].map(([r,q,m,c]) => <div key={r} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.07] pb-3 last:border-0 last:pb-0"><div><strong className="block text-sm">{r}</strong><span className="text-xs text-[#7e8a9e]">{q} · {m}</span></div><span className={cn('size-2 rounded-full',c)} /></div>)}</div></div></div> }
