'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import { cn } from '@/lib/utils';

interface RespostaDeBusca {
  termo: string;
  grupos: Array<{ grupo: string; itens: Array<{ titulo: string; subtitulo: string; url: string }> }>;
}

/** Atrasa a consulta enquanto o usuário ainda está digitando. */
function useTermoAdiado(valor: string, atraso = 280): string {
  const [adiado, setAdiado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setAdiado(valor), atraso);
    return () => clearTimeout(temporizador);
  }, [valor, atraso]);
  return adiado;
}

export function BuscaGlobal() {
  const roteador = useRouter();
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const referencia = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const adiado = useTermoAdiado(termo);

  const { data, isFetching } = useQuery({
    queryKey: chaves.busca(adiado),
    queryFn: async (): Promise<RespostaDeBusca> => {
      const resposta = await api.get<RespostaDeBusca>('/busca', { params: { q: adiado } });
      return resposta.data;
    },
    enabled: adiado.trim().length >= 2,
    staleTime: 15_000,
  });

  useEffect(() => {
    const aoClicarFora = (evento: MouseEvent) => {
      if (referencia.current !== null && !referencia.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  useEffect(() => {
    const atalho = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        campo.current?.focus();
        setAberto(true);
      }
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);

  const grupos = data?.grupos ?? [];
  const temResultado = grupos.length > 0;
  const buscou = adiado.trim().length >= 2;

  return (
    <div ref={referencia} className="relative max-w-md flex-1">
      <label htmlFor="busca-global" className="sr-only">
        Buscar clientes, veículos, agendamentos e produtos
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--tinta-tenue)]"
          aria-hidden
        />
        <input
          ref={campo}
          id="busca-global"
          type="search"
          value={termo}
          placeholder="Buscar cliente, placa, serviço..."
          autoComplete="off"
          onChange={(evento) => {
            setTermo(evento.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          className="h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] pl-9 pr-14 text-sm text-[var(--tinta)] transition-colors placeholder:text-[var(--tinta-tenue)] focus:border-[var(--acento-ativo)] focus:outline-none focus:ring-2 focus:ring-[var(--acento-fraco)]"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
          {isFetching ? (
            <Loader2 className="size-3.5 animate-spin text-[var(--tinta-tenue)]" aria-hidden />
          ) : (
            <kbd className="rounded border border-[var(--borda-forte)] bg-[var(--superficie-3)] px-1.5 py-0.5 text-[10px] text-[var(--tinta-tenue)]">
              ⌘K
            </kbd>
          )}
        </span>
      </div>

      {aberto && buscou ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-[var(--radius-painel)] border border-[var(--borda)] bg-[var(--superficie-1)] shadow-[var(--sombra-elevada)]">
          {!temResultado ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--tinta-suave)]">
              {isFetching ? 'Buscando...' : `Nada encontrado para "${adiado}".`}
            </p>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.grupo} className="border-b border-[var(--borda)] last:border-b-0">
                <p className="rotulo-tecnico px-4 pb-1 pt-3">{grupo.grupo}</p>
                {grupo.itens.map((item) => (
                  <button
                    key={`${grupo.grupo}-${item.url}-${item.titulo}`}
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      setTermo('');
                      roteador.push(item.url);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      'hover:bg-[var(--superficie-2)]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--tinta)]">{item.titulo}</p>
                      <p className="truncate text-xs text-[var(--tinta-tenue)]">{item.subtitulo}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
