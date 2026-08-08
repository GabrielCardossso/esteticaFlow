'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Minus,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AvisoDePlano, CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campo';
import { Cartao } from '@/components/ui/cartao';
import { Dialogo } from '@/components/ui/dialogo';
import { Esqueleto, EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Indicador } from '@/components/ui/indicador';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { formatarData, hojeISO } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useFormasDePagamento } from '@/hooks/use-agenda';
import { usePermissao } from '@/hooks/use-sessao';
import { api, mensagemDeErro, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import {
  despesaSchema,
  receitaAvulsaSchema,
  type DespesaInput,
  type DespesaPayload,
  type FiltroFinanceiro,
  type ReceitaAvulsaInput,
  type ReceitaAvulsaPayload,
} from '@/schemas';
import type {
  IndicadoresFinanceiros,
  LancamentoFinanceiro,
  ParcelaFinanceira,
} from '@/server/financeiro';

interface RespostaFinanceira {
  lancamentos: LancamentoFinanceiro[];
  inicio: string;
  fim: string;
  saldo: string;
  indicadores: IndicadoresFinanceiros;
  parcelas: ParcelaFinanceira[];
}

const ROTULO_CATEGORIA: Record<string, string> = {
  FIXA: 'Despesa fixa',
  VARIAVEL: 'Despesa variável',
  FORNECEDOR: 'Fornecedor',
};

export function PainelFinanceiro() {
  const { permite, carregando } = usePermissao();
  const cache = useQueryClient();

  const [filtro, setFiltro] = useState<FiltroFinanceiro>({ tipo: 'todos', busca: '' });
  const [despesaAberta, setDespesaAberta] = useState(false);
  const [receitaAberta, setReceitaAberta] = useState(false);

  const habilitado = permite('FINANCEIRO');
  const { data: formas } = useFormasDePagamento();

  const { data, isLoading } = useQuery({
    queryKey: chaves.financeiro.lista(filtro),
    queryFn: async () => {
      const resposta = await api.get<RespostaFinanceira>('/financeiro', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.financeiro.todos });
    void cache.invalidateQueries({ queryKey: chaves.painel });
  };

  const registrarDespesa = useMutation({
    mutationFn: async (dados: DespesaPayload) => {
      await api.post('/financeiro/despesas', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Despesa registrada.');
      setDespesaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const registrarReceita = useMutation({
    mutationFn: async (dados: ReceitaAvulsaPayload) => {
      await api.post('/financeiro/receitas', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Receita registrada.');
      setReceitaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const receberParcela = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/financeiro/parcelas/${id}/pagar`);
      return id;
    },
    onSuccess: () => {
      invalidar();
      void cache.invalidateQueries({ queryKey: chaves.agenda.todos });
      toast.success('Parcela marcada como paga.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const formDespesa = useForm<DespesaInput>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      descricao: '',
      categoria: 'VARIAVEL',
      valor: '',
      dataPagamento: hojeISO(),
    },
  });

  const formReceita = useForm<ReceitaAvulsaInput>({
    resolver: zodResolver(receitaAvulsaSchema),
    defaultValues: {
      descricao: '',
      valor: '',
      formaPagamentoId: 0,
      dataRecebimento: hojeISO(),
    },
  });

  if (carregando) return <EsqueletoDeLista linhas={6} />;

  if (!habilitado) {
    return (
      <>
        <CabecalhoDePagina titulo="Financeiro" />
        <AvisoDePlano recurso="O módulo financeiro" />
      </>
    );
  }

  const indicadores = data?.indicadores;

  return (
    <>
      <CabecalhoDePagina
        titulo="Financeiro"
        descricao="Receita entra ao receber o atendimento; despesa entra ao comprar produto."
        acao={
          <>
            <Botao variante="suave" onClick={() => setReceitaAberta(true)}>
              <Plus />
              Receita avulsa
            </Botao>
            <Botao variante="acento" onClick={() => setDespesaAberta(true)}>
              <Minus />
              Nova despesa
            </Botao>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, indice) => <Esqueleto key={indice} className="h-28" />)
          : [
              <Indicador
                key="hoje"
                rotulo="Recebido hoje"
                valor={formatarMoeda(indicadores?.receitaDia ?? 0)}
                icone={CircleDollarSign}
              />,
              <Indicador
                key="mes"
                rotulo="Recebido no mês"
                valor={formatarMoeda(indicadores?.receitaMes ?? 0)}
                detalhe={`Semana: ${formatarMoeda(indicadores?.receitaSemana ?? 0)}`}
                tom="acento"
              />,
              <Indicador
                key="resultado"
                rotulo="Resultado do mês"
                valor={formatarMoeda(indicadores?.lucroMes ?? 0)}
                detalhe={
                  indicadores?.margem === null || indicadores === undefined
                    ? 'Margem —'
                    : `Margem de ${indicadores.margem}%`
                }
                tom={Number(indicadores?.lucroMes ?? 0) >= 0 ? 'positivo' : 'critico'}
              />,
              <Indicador
                key="receber"
                rotulo="A receber"
                valor={formatarMoeda(indicadores?.aReceber ?? 0)}
                detalhe="Atendimentos e parcelas em aberto"
                icone={Wallet}
              />,
            ]}
      </section>

      <Cartao id="parcelas" className="mt-4 overflow-hidden scroll-mt-24">
        <div className="flex flex-col gap-3 border-b border-[var(--borda)] bg-[linear-gradient(135deg,var(--superficie-2),transparent)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--acento-fraco)] text-[var(--acento-ativo)]">
              <CreditCard className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-[var(--tinta)]">Parcelas dos clientes</h2>
              <p className="mt-0.5 text-sm text-[var(--tinta-suave)]">
                Acompanhe vencimentos e reconheça a receita somente quando cada parcela for paga.
              </p>
            </div>
          </div>
          <Etiqueta
            tom={(data?.parcelas.some((item) => !item.paga) ?? false) ? 'atencao' : 'positivo'}
          >
            {data?.parcelas.filter((item) => !item.paga).length ?? 0} em aberto
          </Etiqueta>
        </div>

        {isLoading ? (
          <div className="p-4">
            <EsqueletoDeLista linhas={3} />
          </div>
        ) : (data?.parcelas.length ?? 0) === 0 ? (
          <Vazio
            icone={CalendarClock}
            titulo="Nenhum parcelamento ativo"
            descricao="Ao receber um atendimento no cartão de crédito, as parcelas aparecerão aqui."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Tabela>
                <Cabecalho>
                  <tr>
                    <Coluna>Cliente e veículo</Coluna>
                    <Coluna>Parcela</Coluna>
                    <Coluna>Vencimento</Coluna>
                    <Coluna>Status</Coluna>
                    <Coluna numerica>Valor</Coluna>
                    <Coluna className="text-right">Ação</Coluna>
                  </tr>
                </Cabecalho>
                <Corpo>
                  {(data?.parcelas ?? []).map((parcela) => (
                    <Linha key={parcela.id}>
                      <Celula>
                        <p className="font-medium text-[var(--tinta)]">{parcela.cliente}</p>
                        <p className="mt-0.5 text-xs text-[var(--tinta-tenue)]">
                          {parcela.veiculo}
                        </p>
                      </Celula>
                      <Celula>
                        {parcela.numero}/{parcela.totalParcelas}
                      </Celula>
                      <Celula>{formatarData(parcela.dataVencimento)}</Celula>
                      <Celula>
                        <Etiqueta
                          tom={parcela.paga ? 'positivo' : parcela.atrasada ? 'critico' : 'atencao'}
                        >
                          {parcela.paga ? 'Paga' : parcela.atrasada ? 'Atrasada' : 'Aguardando'}
                        </Etiqueta>
                      </Celula>
                      <Celula numerica>{formatarMoeda(parcela.valor)}</Celula>
                      <Celula className="text-right">
                        {parcela.paga ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--positivo)]">
                            <CheckCircle2 className="size-4" aria-hidden />
                            {formatarData(parcela.dataPagamento)}
                          </span>
                        ) : (
                          <Botao
                            variante="suave"
                            tamanho="pequeno"
                            carregando={
                              receberParcela.isPending && receberParcela.variables === parcela.id
                            }
                            onClick={() => receberParcela.mutate(parcela.id)}
                          >
                            Marcar como paga
                          </Botao>
                        )}
                      </Celula>
                    </Linha>
                  ))}
                </Corpo>
              </Tabela>
            </div>

            <div className="divide-y divide-[var(--borda)] md:hidden">
              {(data?.parcelas ?? []).map((parcela) => (
                <article key={parcela.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--tinta)]">{parcela.cliente}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--tinta-tenue)]">
                        {parcela.veiculo}
                      </p>
                    </div>
                    <Etiqueta
                      tom={parcela.paga ? 'positivo' : parcela.atrasada ? 'critico' : 'atencao'}
                    >
                      {parcela.paga ? 'Paga' : parcela.atrasada ? 'Atrasada' : 'Aguardando'}
                    </Etiqueta>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--superficie-2)] p-3 text-xs">
                    <span>
                      <small className="block text-[var(--tinta-tenue)]">Parcela</small>
                      {parcela.numero}/{parcela.totalParcelas}
                    </span>
                    <span>
                      <small className="block text-[var(--tinta-tenue)]">Vencimento</small>
                      {formatarData(parcela.dataVencimento)}
                    </span>
                    <span className="text-right">
                      <small className="block text-[var(--tinta-tenue)]">Valor</small>
                      {formatarMoeda(parcela.valor)}
                    </span>
                  </div>
                  {!parcela.paga ? (
                    <Botao
                      className="mt-3 w-full"
                      variante="suave"
                      carregando={
                        receberParcela.isPending && receberParcela.variables === parcela.id
                      }
                      onClick={() => receberParcela.mutate(parcela.id)}
                    >
                      Marcar parcela como paga
                    </Botao>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--positivo)]">
                      <CheckCircle2 className="size-4" aria-hidden /> Recebida em{' '}
                      {formatarData(parcela.dataPagamento)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </Cartao>

      <Cartao className="mt-4">
        <div className="grid gap-3 border-b border-[var(--borda)] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            aria-label="Data inicial"
            type="date"
            rotulo="De"
            value={filtro.inicio ?? data?.inicio ?? ''}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, inicio: evento.target.value }))}
          />
          <Campo
            aria-label="Data final"
            type="date"
            rotulo="Até"
            value={filtro.fim ?? data?.fim ?? ''}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, fim: evento.target.value }))}
          />
          <Selecao
            rotulo="Tipo"
            value={filtro.tipo}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                tipo: evento.target.value as FiltroFinanceiro['tipo'],
              }))
            }
          >
            <option value="todos">Entradas e saídas</option>
            <option value="entradas">Somente entradas</option>
            <option value="saidas">Somente saídas</option>
          </Selecao>
          <Campo
            rotulo="Buscar"
            placeholder="Descrição ou categoria"
            prefixo={<Search className="size-4" />}
            value={filtro.busca}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, busca: evento.target.value }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borda)] bg-[var(--superficie-2)] px-4 py-3">
          <span className="text-sm text-[var(--tinta-suave)]">
            {data?.lancamentos.length ?? 0} lançamentos no período
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="text-[var(--tinta-suave)]">Saldo do período:</span>
            <span
              className={
                Number(data?.saldo ?? 0) >= 0
                  ? 'numerico font-semibold text-[var(--positivo)]'
                  : 'numerico font-semibold text-[var(--critico)]'
              }
            >
              {formatarMoeda(data?.saldo ?? 0)}
            </span>
          </span>
        </div>

        {isLoading ? (
          <div className="p-4">
            <EsqueletoDeLista />
          </div>
        ) : (data?.lancamentos.length ?? 0) === 0 ? (
          <Vazio
            icone={Wallet}
            titulo="Nenhum lançamento no período"
            descricao="Ajuste as datas ou registre um lançamento manual."
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Coluna>Data</Coluna>
                <Coluna>Descrição</Coluna>
                <Coluna>Categoria</Coluna>
                <Coluna numerica>Valor</Coluna>
              </tr>
            </Cabecalho>
            <Corpo>
              {(data?.lancamentos ?? []).map((lancamento) => (
                <Linha key={`${lancamento.tipo}-${lancamento.id}`}>
                  <Celula>{formatarData(lancamento.data)}</Celula>
                  <Celula>
                    <span className="flex items-center gap-2">
                      {lancamento.tipo === 'ENTRADA' ? (
                        <ArrowUpCircle
                          className="size-4 shrink-0 text-[var(--positivo)]"
                          aria-hidden
                        />
                      ) : (
                        <ArrowDownCircle
                          className="size-4 shrink-0 text-[var(--critico)]"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 truncate">{lancamento.descricao}</span>
                    </span>
                  </Celula>
                  <Celula>
                    <Etiqueta tom={lancamento.tipo === 'ENTRADA' ? 'positivo' : 'neutro'}>
                      {ROTULO_CATEGORIA[lancamento.categoria] ?? lancamento.categoria}
                    </Etiqueta>
                  </Celula>
                  <Celula numerica>
                    <span
                      className={
                        lancamento.tipo === 'ENTRADA'
                          ? 'text-[var(--positivo)]'
                          : 'text-[var(--critico)]'
                      }
                    >
                      {lancamento.tipo === 'ENTRADA' ? '+' : '−'}
                      {formatarMoeda(lancamento.valor)}
                    </span>
                  </Celula>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>

      {/* ------------------------------- Diálogos ------------------------- */}
      <Dialogo
        aberto={despesaAberta}
        aoMudar={setDespesaAberta}
        largura="estreita"
        titulo="Nova despesa"
        descricao="Compras de estoque já entram automaticamente."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setDespesaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={registrarDespesa.isPending}
              onClick={() =>
                void formDespesa.handleSubmit((dados) =>
                  registrarDespesa.mutate(dados as unknown as DespesaPayload),
                )()
              }
            >
              Registrar
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Campo
            rotulo="Descrição"
            obrigatorio
            erro={formDespesa.formState.errors.descricao?.message}
            {...formDespesa.register('descricao')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Categoria"
              obrigatorio
              erro={formDespesa.formState.errors.categoria?.message}
              {...formDespesa.register('categoria')}
            >
              <option value="FIXA">Despesa fixa</option>
              <option value="VARIAVEL">Despesa variável</option>
              <option value="FORNECEDOR">Fornecedor</option>
            </Selecao>
            <Campo
              rotulo="Valor"
              obrigatorio
              inputMode="decimal"
              prefixo="R$"
              erro={formDespesa.formState.errors.valor?.message}
              {...formDespesa.register('valor')}
            />
          </div>
          <Campo
            rotulo="Data do pagamento"
            type="date"
            obrigatorio
            erro={formDespesa.formState.errors.dataPagamento?.message}
            {...formDespesa.register('dataPagamento')}
          />
        </form>
      </Dialogo>

      <Dialogo
        aberto={receitaAberta}
        aoMudar={setReceitaAberta}
        largura="estreita"
        titulo="Receita avulsa"
        descricao="Para entradas que não vieram de um atendimento."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setReceitaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={registrarReceita.isPending}
              onClick={() =>
                void formReceita.handleSubmit((dados) =>
                  registrarReceita.mutate(dados as unknown as ReceitaAvulsaPayload),
                )()
              }
            >
              Registrar
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Campo
            rotulo="Descrição"
            obrigatorio
            erro={formReceita.formState.errors.descricao?.message}
            {...formReceita.register('descricao')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Valor"
              obrigatorio
              inputMode="decimal"
              prefixo="R$"
              erro={formReceita.formState.errors.valor?.message}
              {...formReceita.register('valor')}
            />
            <Selecao
              rotulo="Forma de pagamento"
              obrigatorio
              erro={formReceita.formState.errors.formaPagamentoId?.message}
              {...formReceita.register('formaPagamentoId')}
            >
              <option value={0}>Selecione</option>
              {(formas ?? []).map((forma) => (
                <option key={forma.id} value={forma.id}>
                  {forma.nome}
                </option>
              ))}
            </Selecao>
          </div>
          <Campo
            rotulo="Data do recebimento"
            type="date"
            obrigatorio
            erro={formReceita.formState.errors.dataRecebimento?.message}
            {...formReceita.register('dataRecebimento')}
          />
        </form>
      </Dialogo>
    </>
  );
}
