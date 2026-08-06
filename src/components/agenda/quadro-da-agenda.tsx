'use client';

import {
  Ban,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Play,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campo';
import { Cartao } from '@/components/ui/cartao';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Vazio } from '@/components/ui/vazio';
import {
  podeExecutar,
  podeRegistrarPagamento,
  ROTULO_STATUS,
  STATUS_AGENDAMENTO,
  type StatusAgendamento,
} from '@/domain/agendamento';
import { formatarPlaca } from '@/domain/shared/documento';
import { formatarDuracao, formatarHora, m, paraISO } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useAcaoDeAgendamento, useAgenda, useProfissionais } from '@/hooks/use-agenda';
import { DialogoDePagamento } from '@/components/agenda/dialogo-de-pagamento';
import type { FiltroAgenda } from '@/schemas';

const TOM_STATUS: Record<StatusAgendamento, TomEtiqueta> = {
  AGENDADO: 'informativo',
  EM_ANDAMENTO: 'acento',
  CONCLUIDO: 'positivo',
  CANCELADO: 'neutro',
};

export function QuadroDaAgenda() {
  const [filtro, setFiltro] = useState<FiltroAgenda>({
    periodo: 'DIA',
    pago: 'todos',
    busca: '',
  });
  const [pagamentoDe, setPagamentoDe] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useAgenda(filtro);
  const { data: profissionais } = useProfissionais();
  const acao = useAcaoDeAgendamento();

  const referencia = filtro.data ?? paraISO(m());

  const navegar = (passo: number) => {
    const unidade = filtro.periodo === 'MES' ? 'month' : filtro.periodo === 'SEMANA' ? 'week' : 'day';
    setFiltro((atual) => ({ ...atual, data: paraISO(m(referencia).add(passo, unidade)) }));
  };

  const resumo = useMemo(() => {
    const itens = data?.itens ?? [];
    return {
      total: itens.length,
      previsto: itens
        .filter((item) => item.status !== 'CANCELADO')
        .reduce((soma, item) => soma + Number(item.total), 0),
      aberto: itens
        .filter((item) => !item.pago && item.status !== 'CANCELADO')
        .reduce((soma, item) => soma + Number(item.total), 0),
      minutos: itens
        .filter((item) => item.status !== 'CANCELADO')
        .reduce((soma, item) => soma + item.duracaoMinutos, 0),
    };
  }, [data]);

  const rotuloPeriodo =
    filtro.periodo === 'DIA'
      ? m(referencia).format('dddd, D [de] MMMM')
      : filtro.periodo === 'SEMANA'
        ? `Semana de ${m(data?.inicio ?? referencia).format('D/MM')} a ${m(data?.fim ?? referencia).format('D/MM')}`
        : m(referencia).format('MMMM [de] YYYY');

  return (
    <>
      <CabecalhoDePagina
        titulo="Agenda"
        descricao="Cada atendimento reserva a janela do profissional pelo tempo real dos serviços."
        acao={
          <Botao comoFilho variante="acento">
            <Link href="/painel/agenda/novo">
              <CalendarPlus />
              Novo atendimento
            </Link>
          </Botao>
        }
      />

      <Cartao className="mb-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--borda)] p-4">
          <div className="flex items-center gap-1">
            <Botao
              variante="suave"
              tamanho="iconePequeno"
              aria-label="Período anterior"
              onClick={() => navegar(-1)}
            >
              <ChevronLeft />
            </Botao>
            <Botao
              variante="suave"
              tamanho="pequeno"
              onClick={() => setFiltro((atual) => ({ ...atual, data: paraISO(m()) }))}
            >
              Hoje
            </Botao>
            <Botao
              variante="suave"
              tamanho="iconePequeno"
              aria-label="Próximo período"
              onClick={() => navegar(1)}
            >
              <ChevronRight />
            </Botao>
          </div>

          <p className="min-w-0 flex-1 truncate text-sm font-medium capitalize text-[var(--tinta)]">
            {rotuloPeriodo}
          </p>

          <div className="flex gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] p-0.5">
            {(['DIA', 'SEMANA', 'MES'] as const).map((periodo) => (
              <button
                key={periodo}
                type="button"
                onClick={() => setFiltro((atual) => ({ ...atual, periodo }))}
                className={
                  filtro.periodo === periodo
                    ? 'rounded-md bg-[var(--acento-ativo)] px-3 py-1 text-xs font-medium text-[var(--acento-texto)]'
                    : 'rounded-md px-3 py-1 text-xs text-[var(--tinta-suave)] transition-colors hover:text-[var(--tinta)]'
                }
              >
                {periodo === 'DIA' ? 'Dia' : periodo === 'SEMANA' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            aria-label="Buscar na agenda"
            placeholder="Cliente, placa ou serviço"
            prefixo={<Search className="size-4" />}
            value={filtro.busca}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, busca: evento.target.value }))}
          />
          <Selecao
            aria-label="Status"
            value={filtro.status ?? ''}
            onChange={(evento) =>
              setFiltro((atual) => {
                const valor = evento.target.value;
                if (valor === '') {
                  const { status: _ignorado, ...resto } = atual;
                  return resto;
                }
                return { ...atual, status: valor as StatusAgendamento };
              })
            }
          >
            <option value="">Todos os status</option>
            {STATUS_AGENDAMENTO.map((status) => (
              <option key={status} value={status}>
                {ROTULO_STATUS[status]}
              </option>
            ))}
          </Selecao>
          <Selecao
            aria-label="Profissional"
            value={filtro.responsavelId ?? ''}
            onChange={(evento) =>
              setFiltro((atual) => {
                const valor = evento.target.value;
                if (valor === '') {
                  const { responsavelId: _ignorado, ...resto } = atual;
                  return resto;
                }
                return { ...atual, responsavelId: Number(valor) };
              })
            }
          >
            <option value="">Todos os profissionais</option>
            {(profissionais ?? []).map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome}
              </option>
            ))}
          </Selecao>
          <Selecao
            aria-label="Pagamento"
            value={filtro.pago}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                pago: evento.target.value as FiltroAgenda['pago'],
              }))
            }
          >
            <option value="todos">Pagos e pendentes</option>
            <option value="pagos">Somente pagos</option>
            <option value="pendentes">Somente pendentes</option>
          </Selecao>
        </div>
      </Cartao>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Atendimentos</span>
          <p className="numerico mt-1 text-2xl font-semibold">{resumo.total}</p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Tempo ocupado</span>
          <p className="numerico mt-1 text-2xl font-semibold">
            {formatarDuracao(resumo.minutos)}
          </p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Previsto</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--acento-ativo)]">
            {formatarMoeda(resumo.previsto)}
          </p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Em aberto</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--atencao)]">
            {formatarMoeda(resumo.aberto)}
          </p>
        </Cartao>
      </div>

      {isLoading ? (
        <EsqueletoDeLista linhas={6} />
      ) : (data?.itens.length ?? 0) === 0 ? (
        <Cartao>
          <Vazio
            icone={CalendarClock}
            titulo="Nenhum atendimento neste período"
            descricao="Ajuste os filtros ou crie um novo atendimento."
            acao={
              <Botao comoFilho variante="acento">
                <Link href="/painel/agenda/novo">
                  <CalendarPlus />
                  Novo atendimento
                </Link>
              </Botao>
            }
          />
        </Cartao>
      ) : (
        <ul className={isFetching ? 'space-y-3 opacity-60' : 'space-y-3'}>
          {(data?.itens ?? []).map((item) => (
            <li key={item.id}>
              <Cartao className="p-4 transition-colors hover:border-[var(--acento-ativo)]">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Faixa de horário: o dado mais importante da linha. */}
                  <div className="w-16 shrink-0 border-r border-[var(--borda)] pr-3 text-center">
                    <p className="numerico text-xl font-semibold text-[var(--acento-ativo)]">
                      {formatarHora(item.dataHora)}
                    </p>
                    <p className="text-[10px] uppercase text-[var(--tinta-tenue)]">
                      {m(item.dataHora).format('DD/MM')}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--tinta-tenue)]">
                      {formatarDuracao(item.duracaoMinutos)}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/painel/agenda/${item.id}`}
                        className="font-medium text-[var(--tinta)] underline-offset-4 hover:text-[var(--acento-ativo)] hover:underline"
                      >
                        {item.clienteNome}
                      </Link>
                      <Etiqueta tom={TOM_STATUS[item.status]}>
                        {ROTULO_STATUS[item.status]}
                      </Etiqueta>
                      {item.pago ? (
                        <Etiqueta tom="positivo">Pago</Etiqueta>
                      ) : item.status !== 'CANCELADO' ? (
                        <Etiqueta tom="atencao">Em aberto</Etiqueta>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-[var(--tinta-suave)]">
                      <span className="numerico">{formatarPlaca(item.veiculoPlaca)}</span> ·{' '}
                      {item.veiculoModelo}
                      {item.responsavelNome !== null ? ` · ${item.responsavelNome}` : ''}
                    </p>

                    <p className="mt-1 truncate text-xs text-[var(--tinta-tenue)]">
                      {item.servicos.map((servico) => servico.nome).join(' · ')}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="numerico text-lg font-semibold text-[var(--tinta)]">
                      {formatarMoeda(item.total)}
                    </p>
                    <div className="flex gap-1">
                      {podeExecutar(item.status, 'INICIAR') ? (
                        <Botao
                          variante="suave"
                          tamanho="pequeno"
                          onClick={() => acao.mutate({ id: item.id, acao: 'INICIAR' })}
                        >
                          <Play />
                          Iniciar
                        </Botao>
                      ) : null}
                      {podeRegistrarPagamento(item.status, item.pago) ? (
                        <Botao
                          variante="suave"
                          tamanho="pequeno"
                          onClick={() => setPagamentoDe(item.id)}
                        >
                          <CircleDollarSign />
                          Receber
                        </Botao>
                      ) : null}
                      {podeExecutar(item.status, 'CANCELAR') ? (
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label="Cancelar agendamento"
                          onClick={() => acao.mutate({ id: item.id, acao: 'CANCELAR' })}
                        >
                          <Ban />
                        </Botao>
                      ) : null}
                      <Botao comoFilho variante="fantasma" tamanho="pequeno">
                        <Link href={`/painel/agenda/${item.id}`}>Detalhe</Link>
                      </Botao>
                    </div>
                  </div>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>
      )}

      <DialogoDePagamento
        agendamentoId={pagamentoDe}
        aoFechar={() => setPagamentoDe(null)}
      />
    </>
  );
}
