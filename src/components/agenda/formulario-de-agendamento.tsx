'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CalendarPlus, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho, CartaoCorpo } from '@/components/ui/cartao';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Dinheiro } from '@/domain/shared/decimal';
import { formatarPlaca } from '@/domain/shared/documento';
import { formatarDuracao, paraInputDataHora, m } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useCriarAgendamento, useProfissionais, useVeiculosDoCliente } from '@/hooks/use-agenda';
import { api, FalhaDaApi } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import { agendamentoSchema, type AgendamentoInput, type AgendamentoPayload } from '@/schemas';
import type { ClienteDaLista } from '@/server/clientes';
import type { ServicoDaLista } from '@/server/servicos';

export function FormularioDeAgendamento() {
  const roteador = useRouter();
  const parametros = useSearchParams();
  const clienteInicial = Number.parseInt(parametros.get('clienteId') ?? '', 10);

  const [precisaConfirmar, setPrecisaConfirmar] = useState(false);

  const criar = useCriarAgendamento();
  const { data: profissionais } = useProfissionais();

  const { data: clientes } = useQuery({
    queryKey: chaves.clientes.lista({ contexto: 'agendamento' }),
    queryFn: async () => {
      const resposta = await api.get<ClienteDaLista[]>('/clientes', {
        params: { situacao: 'ativos', ordenacao: 'nome' },
      });
      return resposta.data;
    },
  });

  const { data: servicos } = useQuery({
    queryKey: chaves.servicos.lista({ contexto: 'agendamento' }),
    queryFn: async () => {
      const resposta = await api.get<ServicoDaLista[]>('/servicos', {
        params: { situacao: 'ativos', ordenacao: 'nome' },
      });
      return resposta.data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgendamentoInput>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      clienteId: Number.isInteger(clienteInicial) ? clienteInicial : 0,
      veiculoId: 0,
      servicoIds: [],
      responsavelId: '',
      dataHora: paraInputDataHora(m().add(1, 'hour').startOf('hour')),
      desconto: '0',
      observacoes: '',
      confirmarConflito: false,
    },
  });

  const clienteSelecionado = Number(watch('clienteId'));
  const servicosObservados = watch('servicoIds');
  const descontoObservado = watch('desconto');

  const { data: veiculos } = useVeiculosDoCliente(
    Number.isInteger(clienteSelecionado) && clienteSelecionado > 0 ? clienteSelecionado : null,
  );

  useEffect(() => {
    setValue('veiculoId', 0);
  }, [clienteSelecionado, setValue]);

  const totais = useMemo(() => {
    const selecionados = (servicosObservados ?? []) as number[];
    const descontoInformado = descontoObservado ?? '0';
    const escolhidos = (servicos ?? []).filter((servico) =>
      selecionados.includes(servico.id),
    );
    const subtotal = escolhidos.reduce(
      (soma, servico) => Dinheiro.somar(soma, servico.preco),
      Dinheiro.zero,
    );
    const desconto = /^\d+([.,]\d+)?$/.test(String(descontoInformado))
      ? Dinheiro.de(String(descontoInformado).replace(',', '.'))
      : Dinheiro.zero;
    const minutos = escolhidos.reduce((soma, servico) => soma + servico.tempoEstimadoMinutos, 0);
    return {
      escolhidos,
      subtotal,
      desconto,
      total: Dinheiro.subtrair(subtotal, desconto),
      minutos,
      descontoInvalido:
        !Dinheiro.ehZero(subtotal) && Dinheiro.comparar(desconto, subtotal) >= 0,
    };
  }, [servicos, servicosObservados, descontoObservado]);

  const enviar = handleSubmit((dados) => {
    criar.mutate(
      { ...dados, confirmarConflito: precisaConfirmar } as unknown as AgendamentoPayload,
      {
        onSuccess: (retorno) => {
          roteador.push(`/painel/agenda/${retorno.id}`);
        },
        onError: (erro: unknown) => {
          if (erro instanceof FalhaDaApi && erro.exigeConfirmacao) {
            setPrecisaConfirmar(true);
          }
        },
      },
    );
  });

  return (
    <>
      <Botao comoFilho variante="fantasma" tamanho="pequeno" className="mb-4">
        <Link href="/painel/agenda">
          <ArrowLeft />
          Agenda
        </Link>
      </Botao>

      <CabecalhoDePagina
        titulo="Novo atendimento"
        descricao="O preço de cada serviço é congelado no momento do agendamento."
      />

      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar();
        }}
        className="grid gap-4 lg:grid-cols-[1.6fr_1fr]"
      >
        <div className="space-y-4">
          <Cartao>
            <CartaoCabecalho titulo="Cliente e veículo" />
            <CartaoCorpo className="grid gap-4 sm:grid-cols-2">
              <Selecao
                rotulo="Cliente"
                obrigatorio
                erro={errors.clienteId?.message}
                {...register('clienteId')}
              >
                <option value={0}>Selecione o cliente</option>
                {(clientes ?? []).map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </Selecao>

              <Selecao
                rotulo="Veículo"
                obrigatorio
                ajuda={
                  clienteSelecionado > 0 && (veiculos?.length ?? 0) === 0
                    ? 'Este cliente ainda não tem veículo ativo.'
                    : undefined
                }
                erro={errors.veiculoId?.message}
                {...register('veiculoId')}
              >
                <option value={0}>Selecione o veículo</option>
                {(veiculos ?? [])
                  .filter((veiculo) => veiculo.ativo)
                  .map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.marca} {veiculo.modelo} · {formatarPlaca(veiculo.placa)}
                    </option>
                  ))}
              </Selecao>
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho
              titulo="Serviços"
              descricao="A duração total define a janela reservada na agenda."
            />
            <CartaoCorpo>
              {errors.servicoIds !== undefined ? (
                <p role="alert" className="mb-3 text-xs text-[var(--critico)]">
                  {errors.servicoIds.message}
                </p>
              ) : null}

              <Controller
                control={control}
                name="servicoIds"
                render={({ field }) => {
                  const atual = (field.value ?? []) as number[];
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(servicos ?? []).map((servico) => {
                        const marcado = atual.includes(servico.id);
                        return (
                          <button
                            key={servico.id}
                            type="button"
                            onClick={() =>
                              field.onChange(
                                marcado
                                  ? atual.filter((id) => id !== servico.id)
                                  : [...atual, servico.id],
                              )
                            }
                            className={
                              marcado
                                ? 'flex items-start gap-3 rounded-lg border border-[var(--acento-ativo)] bg-[var(--acento-fraco)] p-3 text-left transition-colors'
                                : 'flex items-start gap-3 rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] p-3 text-left transition-colors hover:border-[var(--borda-forte)]'
                            }
                          >
                            <span
                              aria-hidden
                              className={
                                marcado
                                  ? 'mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-[var(--acento-ativo)] bg-[var(--acento-ativo)]'
                                  : 'mt-0.5 size-4 shrink-0 rounded border border-[var(--borda-forte)]'
                              }
                            >
                              {marcado ? (
                                <Check className="size-3 text-[var(--acento-texto)]" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-[var(--tinta)]">
                                {servico.nome}
                              </span>
                              <span className="mt-0.5 block text-xs text-[var(--tinta-tenue)]">
                                {formatarMoeda(servico.preco)} ·{' '}
                                {formatarDuracao(servico.tempoEstimadoMinutos)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }}
              />
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho titulo="Horário e responsável" />
            <CartaoCorpo className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Data e hora"
                type="datetime-local"
                obrigatorio
                erro={errors.dataHora?.message}
                {...register('dataHora')}
              />
              <Selecao
                rotulo="Profissional responsável"
                ajuda="Sem responsável, a sobreposição vira apenas um aviso."
                erro={errors.responsavelId?.message}
                {...register('responsavelId')}
              >
                <option value="">Sem responsável definido</option>
                {(profissionais ?? []).map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </Selecao>
              <AreaDeTexto
                rotulo="Observações"
                className="sm:col-span-2"
                placeholder="Combinações com o cliente, pontos de atenção no veículo..."
                erro={errors.observacoes?.message}
                {...register('observacoes')}
              />
            </CartaoCorpo>
          </Cartao>
        </div>

        {/* ------------------------------ Resumo lateral ------------------ */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Cartao destaque>
            <CartaoCabecalho titulo="Resumo" />
            <CartaoCorpo className="space-y-4">
              {totais.escolhidos.length === 0 ? (
                <p className="text-sm text-[var(--tinta-suave)]">
                  Selecione ao menos um serviço para ver o total.
                </p>
              ) : (
                <ul className="space-y-2">
                  {totais.escolhidos.map((servico) => (
                    <li key={servico.id} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-[var(--tinta-suave)]">
                        {servico.nome}
                      </span>
                      <span className="numerico shrink-0 text-[var(--tinta)]">
                        {formatarMoeda(servico.preco)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <Campo
                rotulo="Desconto"
                inputMode="decimal"
                prefixo="R$"
                ajuda="Precisa ser menor que o subtotal."
                erro={
                  totais.descontoInvalido
                    ? 'O desconto deve ser menor que o subtotal.'
                    : errors.desconto?.message
                }
                {...register('desconto')}
              />

              <dl className="space-y-1.5 border-t border-[var(--borda)] pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--tinta-suave)]">Subtotal</dt>
                  <dd className="numerico">{formatarMoeda(totais.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--tinta-suave)]">Desconto</dt>
                  <dd className="numerico text-[var(--critico)]">
                    −{formatarMoeda(totais.desconto)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--tinta-suave)]">Duração estimada</dt>
                  <dd className="numerico">{formatarDuracao(totais.minutos)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[var(--borda)] pt-2.5">
                  <dt className="font-medium text-[var(--tinta)]">Total</dt>
                  <dd className="numerico text-xl font-semibold text-[var(--acento-ativo)]">
                    {formatarMoeda(totais.total)}
                  </dd>
                </div>
              </dl>

              {precisaConfirmar ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-[var(--atencao)]/40 bg-[var(--atencao-fraco)] p-3 text-sm text-[var(--atencao)]"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Já existe outro atendimento neste horário sem responsável definido. Salve de
                    novo para confirmar mesmo assim.
                  </span>
                </div>
              ) : null}

              <Botao
                type="submit"
                variante="acento"
                tamanho="grande"
                className="w-full"
                carregando={isSubmitting || criar.isPending}
                disabled={totais.descontoInvalido}
              >
                <CalendarPlus />
                {precisaConfirmar ? 'Confirmar mesmo assim' : 'Agendar atendimento'}
              </Botao>

              <Etiqueta tom="neutro" className="w-full justify-center">
                Não é possível agendar no passado
              </Etiqueta>
            </CartaoCorpo>
          </Cartao>
        </div>
      </form>
    </>
  );
}
