'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Play,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { DialogoDeConclusao } from '@/components/agenda/dialogo-de-conclusao';
import { DialogoDePagamento } from '@/components/agenda/dialogo-de-pagamento';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo } from '@/components/ui/cartao';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Vazio } from '@/components/ui/vazio';
import {
  podeExecutar,
  podeRegistrarPagamento,
  ROTULO_STATUS,
  type StatusAgendamento,
} from '@/domain/agendamento';
import { formatarPlaca, formatarTelefone } from '@/domain/shared/documento';
import { formatarData, formatarDataHora, formatarDuracao } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useAcaoDeAgendamento, useAgendamento } from '@/hooks/use-agenda';
import { mensagemDeErro } from '@/lib/api';

const TOM_STATUS: Record<StatusAgendamento, TomEtiqueta> = {
  AGENDADO: 'informativo',
  EM_ANDAMENTO: 'acento',
  CONCLUIDO: 'positivo',
  CANCELADO: 'neutro',
};

export function DetalheDoAtendimento({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useAgendamento(id);
  const acao = useAcaoDeAgendamento();
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [conclusaoAberta, setConclusaoAberta] = useState(false);

  if (isLoading) {
    return (
      <>
        <Esqueleto className="mb-6 h-10 w-72" />
        <Esqueleto className="h-96" />
      </>
    );
  }

  if (isError || data === undefined) {
    return (
      <Cartao>
        <Vazio
          icone={AlertTriangle}
          titulo="Atendimento não encontrado"
          descricao={mensagemDeErro(error)}
          acao={
            <Botao comoFilho variante="contorno">
              <Link href="/painel/agenda">
                <ArrowLeft />
                Voltar para a agenda
              </Link>
            </Botao>
          }
        />
      </Cartao>
    );
  }

  return (
    <>
      <Botao comoFilho variante="fantasma" tamanho="pequeno" className="mb-4">
        <Link href="/painel/agenda">
          <ArrowLeft />
          Agenda
        </Link>
      </Botao>

      <CabecalhoDePagina
        titulo={`Atendimento #${data.id}`}
        descricao={formatarDataHora(data.dataHora)}
        acao={
          <>
            {podeExecutar(data.status, 'INICIAR') ? (
              <Botao
                variante="suave"
                onClick={() => acao.mutate({ id: data.id, acao: 'INICIAR' })}
                carregando={acao.isPending}
              >
                <Play />
                Iniciar
              </Botao>
            ) : null}
            {podeRegistrarPagamento(data.status, data.pago) ? (
              <Botao variante="suave" onClick={() => setPagamentoAberto(true)}>
                <CircleDollarSign />
                Receber
              </Botao>
            ) : null}
            {podeExecutar(data.status, 'CONCLUIR') ? (
              <Botao variante="acento" onClick={() => setConclusaoAberta(true)}>
                <CheckCircle2 />
                Concluir
              </Botao>
            ) : null}
            {podeExecutar(data.status, 'CANCELAR') ? (
              <Botao
                variante="critico"
                onClick={() => acao.mutate({ id: data.id, acao: 'CANCELAR' })}
              >
                <Ban />
                Cancelar
              </Botao>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Etiqueta tom={TOM_STATUS[data.status]}>{ROTULO_STATUS[data.status]}</Etiqueta>
        <Etiqueta tom={data.pago ? 'positivo' : 'atencao'}>
          {data.pago ? 'Pago' : 'Pagamento em aberto'}
        </Etiqueta>
        <Etiqueta tom="neutro">Duração {formatarDuracao(data.duracaoMinutos)}</Etiqueta>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Cartao>
            <CartaoCabecalho titulo="Serviços contratados" />
            <ul className="divide-y divide-[var(--borda)]">
              {data.servicos.map((servico) => (
                <li key={servico.id} className="flex items-center gap-3 px-5 py-3">
                  <Wrench className="size-4 shrink-0 text-[var(--acento-ativo)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--tinta)]">{servico.nome}</p>
                    <p className="text-xs text-[var(--tinta-tenue)]">
                      {formatarDuracao(servico.minutos)}
                    </p>
                  </div>
                  <span className="numerico text-sm text-[var(--tinta)]">
                    {formatarMoeda(servico.preco)}
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>

          {data.observacoes !== null ? (
            <Cartao>
              <CartaoCabecalho titulo="Observações" />
              <CartaoCorpo>
                <p className="whitespace-pre-line text-sm text-[var(--tinta-suave)]">
                  {data.observacoes}
                </p>
              </CartaoCorpo>
            </Cartao>
          ) : null}

          {data.receita !== null ? (
            <Cartao>
              <CartaoCabecalho titulo="Recebimento" />
              <CartaoCorpo className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--tinta)]">{data.receita.forma}</p>
                  <p className="text-xs text-[var(--tinta-tenue)]">
                    Recebido em {formatarData(data.receita.data)}
                  </p>
                </div>
                <p className="numerico text-xl font-semibold text-[var(--positivo)]">
                  {formatarMoeda(data.receita.valor)}
                </p>
              </CartaoCorpo>
            </Cartao>
          ) : null}
        </div>

        <div className="space-y-4">
          <Cartao destaque>
            <CartaoCabecalho titulo="Valores" />
            <CartaoCorpo>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--tinta-suave)]">Subtotal</dt>
                  <dd className="numerico">{formatarMoeda(data.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--tinta-suave)]">Desconto</dt>
                  <dd className="numerico text-[var(--critico)]">
                    −{formatarMoeda(data.desconto)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[var(--borda)] pt-2.5">
                  <dt className="font-medium">Total</dt>
                  <dd className="numerico text-2xl font-semibold text-[var(--acento-ativo)]">
                    {formatarMoeda(data.total)}
                  </dd>
                </div>
              </dl>
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho titulo="Cliente e veículo" />
            <CartaoCorpo className="space-y-3.5 text-sm">
              <div>
                <p className="rotulo-tecnico">Cliente</p>
                <Link
                  href={`/painel/clientes/${data.clienteId}`}
                  className="mt-0.5 block font-medium text-[var(--tinta)] underline-offset-4 hover:text-[var(--acento-ativo)] hover:underline"
                >
                  {data.clienteNome}
                </Link>
                <p className="numerico text-xs text-[var(--tinta-tenue)]">
                  {formatarTelefone(data.clienteTelefone)}
                </p>
              </div>
              <div>
                <p className="rotulo-tecnico">Veículo</p>
                <p className="mt-0.5 text-[var(--tinta)]">{data.veiculoModelo}</p>
                <p className="numerico text-xs text-[var(--tinta-tenue)]">
                  {formatarPlaca(data.veiculoPlaca)}
                </p>
              </div>
              <div>
                <p className="rotulo-tecnico">Responsável</p>
                <p className="mt-0.5 text-[var(--tinta)]">
                  {data.responsavelNome ?? 'Sem responsável definido'}
                </p>
              </div>
            </CartaoCorpo>
          </Cartao>
        </div>
      </div>

      <DialogoDePagamento
        agendamentoId={pagamentoAberto ? data.id : null}
        aoFechar={() => setPagamentoAberto(false)}
      />

      <DialogoDeConclusao
        aberto={conclusaoAberta}
        aoFechar={() => setConclusaoAberta(false)}
        agendamentoId={data.id}
        jaPago={data.pago}
      />
    </>
  );
}
