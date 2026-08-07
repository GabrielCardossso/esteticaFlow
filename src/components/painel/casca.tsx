'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  Gauge,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Marca, Simbolo } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { Etiqueta } from '@/components/ui/etiqueta';
import { BuscaGlobal } from '@/components/painel/busca-global';
import type { Papel, Recurso, StatusAssinatura } from '@/domain/plano';
import { diasEmAtraso } from '@/domain/plano';
import type { ModoTema } from '@/domain/tema';
import { formatarData } from '@/domain/shared/tempo';
import { useSessao, type SessaoAtual } from '@/hooks/use-sessao';
import { api } from '@/lib/api';
import { aplicarTemaNoDocumento } from '@/lib/tema-cliente';
import { cn } from '@/lib/utils';

interface ItemDeMenu {
  href: string;
  rotulo: string;
  icone: typeof Gauge;
  recurso?: Recurso;
  somenteSuperAdmin?: boolean;
}

const MENU: readonly ItemDeMenu[] = [
  { href: '/painel', rotulo: 'Painel', icone: Gauge },
  { href: '/painel/agenda', rotulo: 'Agenda', icone: CalendarClock, recurso: 'AGENDA' },
  { href: '/painel/clientes', rotulo: 'Clientes', icone: Users, recurso: 'CLIENTES' },
  { href: '/painel/servicos', rotulo: 'Serviços', icone: Wrench, recurso: 'SERVICOS' },
  { href: '/painel/estoque', rotulo: 'Estoque', icone: Boxes, recurso: 'ESTOQUE' },
  { href: '/painel/financeiro', rotulo: 'Financeiro', icone: Wallet, recurso: 'FINANCEIRO' },
  {
    href: '/painel/relatorios',
    rotulo: 'Relatórios',
    icone: ScrollText,
    recurso: 'RELATORIO_SIMPLES',
  },
  { href: '/painel/notificacoes', rotulo: 'Notificações', icone: Bell },
  { href: '/painel/configuracoes', rotulo: 'Configurações', icone: Settings },
  { href: '/painel/plataforma', rotulo: 'Plataforma', icone: Building2, somenteSuperAdmin: true },
];

export function Casca({
  children,
  modoInicial,
  empresa,
  usuario,
  papel,
  recursos,
  statusAssinatura,
  proximoVencimento,
  inatividadeAtiva,
  inatividadeMinutos,
  sessaoInicial,
}: {
  children: ReactNode;
  modoInicial: ModoTema;
  empresa: string;
  usuario: string;
  papel: Papel;
  recursos: Recurso[];
  statusAssinatura: StatusAssinatura;
  proximoVencimento: string;
  inatividadeAtiva: boolean;
  inatividadeMinutos: number;
  sessaoInicial: SessaoAtual;
}) {
  const caminho = usePathname();
  const clienteDeCache = useQueryClient();
  const { data: sessao } = useSessao(sessaoInicial);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modo, setModo] = useState<ModoTema>(modoInicial === 'sistema' ? 'escuro' : modoInicial);

  const naoLidas = sessao?.notificacoesNaoLidas ?? 0;
  const ehSuperAdmin = papel === 'SUPER_ADMIN';

  useEffect(() => {
    setMenuAberto(false);
  }, [caminho]);

  useEffect(() => {
    if (sessao === undefined) return;
    const modoDaSessao =
      sessao.preferencias.modo === 'sistema' ? 'escuro' : sessao.preferencias.modo;
    setModo(modoDaSessao);
    aplicarTemaNoDocumento(sessao.preferencias);
  }, [sessao]);

  const alternarModo = useCallback(() => {
    const proximo: ModoTema = modo === 'escuro' ? 'claro' : 'escuro';
    setModo(proximo);
    document.documentElement.dataset['modo'] = proximo;
    document.cookie = `esteticaflow_modo=${proximo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [modo]);

  const sair = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clienteDeCache.clear();
      window.location.assign('/login');
    },
  });

  // Encerramento por inatividade: preferência da empresa, não imposição.
  useEffect(() => {
    if (!inatividadeAtiva) return;

    let temporizador: ReturnType<typeof setTimeout>;
    const limite = inatividadeMinutos * 60 * 1000;

    const reiniciar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        void api.post('/auth/logout').finally(() => {
          window.location.assign('/login?motivo=inatividade');
        });
      }, limite);
    };

    const eventos = ['pointerdown', 'keydown', 'scroll', 'visibilitychange'] as const;
    for (const evento of eventos) window.addEventListener(evento, reiniciar, { passive: true });
    reiniciar();

    return () => {
      clearTimeout(temporizador);
      for (const evento of eventos) window.removeEventListener(evento, reiniciar);
    };
  }, [inatividadeAtiva, inatividadeMinutos]);

  const visiveis = MENU.filter((item) => {
    if (item.somenteSuperAdmin === true) return ehSuperAdmin;
    if (item.recurso === undefined) return true;
    return recursos.includes(item.recurso);
  });

  const ativo = (href: string): boolean =>
    href === '/painel' ? caminho === '/painel' : caminho.startsWith(href);

  const navegacao = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegação principal">
      {visiveis.map((item) => {
        const Icone = item.icone;
        const selecionado = ativo(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selecionado ? 'page' : undefined}
            className={cn(
              'painel-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-[var(--duracao-curta)]',
              selecionado
                ? 'bg-[var(--acento-fraco)] font-medium text-[var(--acento-ativo)]'
                : 'text-[var(--tinta-suave)] hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)]',
            )}
          >
            {selecionado ? (
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--acento-ativo)]"
              />
            ) : null}
            <Icone className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{item.rotulo}</span>
            {item.rotulo === 'Notificações' && naoLidas > 0 ? (
              <span className="numerico grid min-w-5 place-items-center rounded-full bg-[var(--acento-ativo)] px-1.5 text-[11px] font-semibold text-[var(--acento-texto)]">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const rodapeLateral = (
    <div className="border-t border-[var(--borda)] p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--acento-fraco)] text-sm font-semibold text-[var(--acento-ativo)]"
        >
          {usuario.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--tinta)]">{usuario}</p>
          <p className="truncate text-xs text-[var(--tinta-tenue)]">{empresa}</p>
        </div>
      </div>
      <Botao
        variante="fantasma"
        tamanho="pequeno"
        className="mt-1 w-full justify-start"
        onClick={() => sair.mutate()}
        carregando={sair.isPending}
      >
        <LogOut />
        Sair
      </Botao>
    </div>
  );

  const diasAtraso = diasEmAtraso(proximoVencimento);

  return (
    <div className="flex min-h-dvh">
      {/* -------------------------------- Lateral fixa (desktop) ---------- */}
      <aside className="painel-lateral sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--borda)] lg:flex">
        <div className="flex h-[72px] items-center border-b border-[var(--borda)] px-5">
          <Link href="/painel" aria-label="Ir para o painel">
            <Marca />
          </Link>
        </div>
        {navegacao}
        {rodapeLateral}
      </aside>

      {/* -------------------------------- Gaveta (mobile) ----------------- */}
      {menuAberto ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="painel-lateral relative flex h-full w-72 max-w-[85vw] flex-col border-r border-[var(--borda)] shadow-2xl">
            <div className="flex h-[72px] items-center justify-between border-b border-[var(--borda)] px-5">
              <Marca />
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="rounded-md p-1 text-[var(--tinta-tenue)] hover:text-[var(--tinta)]"
              >
                <X className="size-5" />
              </button>
            </div>
            {navegacao}
            {rodapeLateral}
          </div>
        </div>
      ) : null}

      {/* -------------------------------- Conteúdo ------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="painel-topo sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[var(--borda)] bg-[var(--superficie-0)]/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1.5 text-[var(--tinta-suave)] transition-colors hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)] lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/painel" className="lg:hidden" aria-label="Ir para o painel">
            <Simbolo className="size-7" />
          </Link>

          <BuscaGlobal />

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={alternarModo}
              aria-label={modo === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="rounded-md p-2 text-[var(--tinta-suave)] transition-colors hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)]"
            >
              {modo === 'escuro' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <Link
              href="/painel/notificacoes"
              aria-label={`Notificações${naoLidas > 0 ? `: ${naoLidas} não lidas` : ''}`}
              className="relative rounded-md p-2 text-[var(--tinta-suave)] transition-colors hover:bg-[var(--superficie-2)] hover:text-[var(--tinta)]"
            >
              <Bell className="size-4" />
              {naoLidas > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--acento-ativo)] ring-2 ring-[var(--superficie-0)]" />
              ) : null}
            </Link>
          </div>
        </header>

        {/* Aviso de assinatura: informa sem bloquear quem ainda pode operar. */}
        {statusAssinatura === 'EM_ATRASO' && !ehSuperAdmin ? (
          <div
            role="status"
            className="flex flex-wrap items-center gap-2 border-b border-[var(--atencao)]/30 bg-[var(--atencao-fraco)] px-4 py-2.5 text-sm text-[var(--atencao)] sm:px-6"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span>
              Assinatura em atraso há {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'} — vencimento
              em {formatarData(proximoVencimento)}.
            </span>
            <Etiqueta tom="atencao" className="ml-auto">
              Regularize para manter o acesso
            </Etiqueta>
          </div>
        ) : null}

        {ehSuperAdmin ? (
          <div className="flex items-center gap-2 border-b border-[var(--informativo)]/25 bg-[var(--informativo-fraco)] px-4 py-2 text-xs text-[var(--informativo)] sm:px-6">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            Sessão da plataforma: você enxerga recursos de todos os planos.
          </div>
        ) : null}

        <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
