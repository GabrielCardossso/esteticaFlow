'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Package,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo } from '@/components/ui/cartao';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Indicador, Medidor } from '@/components/ui/indicador';
import { Vazio } from '@/components/ui/vazio';
import { CATALOGO_RELACIONAMENTO, type Relacionamento } from '@/domain/cliente';
import { ROTULO_STATUS, type StatusAgendamento } from '@/domain/agendamento';
import { formatarHora, formatarRelativo, m } from '@/domain/shared/tempo';
import { formatarMoeda, formatarQuantidade } from '@/domain/shared/texto';
import { useSessao } from '@/hooks/use-sessao';
import { api, mensagemDeErro } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import type { PainelDados } from '@/server/painel';

const CORES_GRAFICO = [
  'var(--acento-ativo)',
  'var(--informativo)',
  'var(--positivo)',
  'var(--atencao)',
  'var(--critico)',
] as const;

const TOM_STATUS: Record<StatusAgendamento, 'acento' | 'informativo' | 'positivo' | 'neutro'> = {
  AGENDADO: 'informativo',
  EM_ANDAMENTO: 'acento',
  CONCLUIDO: 'positivo',
  CANCELADO: 'neutro',
};

export function VisaoDoPainel() {
  const { data: sessao } = useSessao();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: chaves.painel,
    queryFn: async (): Promise<PainelDados> => {
      const resposta = await api.get<PainelDados>('/painel');
      return resposta.data;
    },
  });

  const primeiroNome = sessao?.usuario.nome.split(' ')[0] ?? '';
  const saudacao = (() => {
    const hora = m().hour();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  if (isLoading) {
    return (
      <>
        <CabecalhoDePagina titulo="Painel" descricao="Carregando indicadores..." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} className="h-28" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Esqueleto className="h-80 lg:col-span-2" />
          <Esqueleto className="h-80" />
        </div>
      </>
    );
  }

  if (isError || data === undefined) {
    return (
      <>
        <CabecalhoDePagina titulo="Painel" />
        <Cartao>
          <Vazio
            icone={AlertTriangle}
            titulo="Não foi possível carregar o painel"
            descricao={mensagemDeErro(error)}
          />
        </Cartao>
      </>
    );
  }

  const podeFinanceiro = sessao?.recursos.includes('FINANCEIRO') ?? false;
  const podeEstoque = sessao?.recursos.includes('ESTOQUE') ?? false;

  const serieGrafico = data.serie.map((item) => ({
    mes: item.mes,
    Receita: Number(item.receita),
    Despesa: Number(item.despesa),
  }));

  const relacionamentos = Object.entries(data.relacionamento) as Array<[Relacionamento, number]>;

  return (
    <>
      <CabecalhoDePagina
        titulo={`${saudacao}${primeiroNome === '' ? '' : `, ${primeiroNome}`}`}
        descricao={`Visão consolidada de ${m().format('MMMM [de] YYYY')}.`}
        acao={
          <Botao comoFilho variante="acento">
            <Link href="/painel/agenda/novo">
              <CalendarClock />
              Novo atendimento
            </Link>
          </Botao>
        }
      />

      {/* ------------------------------- Indicadores --------------------- */}
      <section aria-label="Indicadores do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Faturamento do mês"
          valor={podeFinanceiro ? formatarMoeda(data.receitaMes) : '—'}
          variacao={data.variacaoReceita}
          detalhe={podeFinanceiro ? undefined : 'Disponível no plano Pro'}
          icone={CircleDollarSign}
          tom="acento"
        />
        <Indicador
          rotulo="Resultado do mês"
          valor={podeFinanceiro ? formatarMoeda(data.lucroMes) : '—'}
          detalhe={podeFinanceiro ? `Margem de ${data.margem}%` : undefined}
          icone={TrendingUp}
          tom={Number(data.lucroMes) >= 0 ? 'positivo' : 'critico'}
        />
        <Indicador
          rotulo="Ticket médio"
          valor={formatarMoeda(data.ticketMedio)}
          detalhe={`${data.concluidosMes} concluídos no mês`}
          icone={Receipt}
        />
        <Indicador
          rotulo="Na agenda hoje"
          valor={String(data.atendimentosHoje)}
          detalhe={`${data.atendimentosMes} no mês`}
          icone={CalendarClock}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* ----------------------------- Faturamento ---------------------- */}
        <Cartao className="lg:col-span-2" destaque>
          <CartaoCabecalho
            titulo="Faturamento e despesa"
            descricao="Últimos seis meses fechados"
          />
          <CartaoCorpo>
            {!podeFinanceiro ? (
              <Vazio
                icone={CircleDollarSign}
                titulo="Módulo financeiro no plano Pro"
                descricao="Assine o plano Pro para acompanhar receita, despesa e margem."
              />
            ) : serieGrafico.length === 0 ? (
              <Vazio icone={TrendingUp} titulo="Ainda sem histórico" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieGrafico} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: 'var(--tinta-tenue)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--borda)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--tinta-tenue)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(valor: number) =>
                        valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(valor)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--acento-fraco)' }}
                      contentStyle={{
                        background: 'var(--superficie-2)',
                        border: '1px solid var(--borda)',
                        borderRadius: 10,
                        color: 'var(--tinta)',
                        fontSize: 12,
                      }}
                      formatter={(valor: number | string) => formatarMoeda(Number(valor))}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: 'var(--tinta-suave)' }}
                      iconType="circle"
                    />
                    <Bar dataKey="Receita" fill="var(--acento-ativo)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="var(--borda-forte)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CartaoCorpo>
        </Cartao>

        {/* ----------------------------- Agenda --------------------------- */}
        <Cartao>
          <CartaoCabecalho
            titulo="Próximos atendimentos"
            acao={
              <Botao comoFilho variante="fantasma" tamanho="pequeno">
                <Link href="/painel/agenda">
                  Ver agenda
                  <ArrowRight />
                </Link>
              </Botao>
            }
          />
          {data.agendaProxima.length === 0 ? (
            <Vazio
              icone={CalendarClock}
              titulo="Agenda livre"
              descricao="Nenhum atendimento nos próximos sete dias."
            />
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {data.agendaProxima.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/painel/agenda/${item.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--superficie-2)]"
                  >
                    <div className="text-center">
                      <p className="numerico text-sm font-semibold text-[var(--acento-ativo)]">
                        {formatarHora(item.dataHora)}
                      </p>
                      <p className="text-[10px] uppercase text-[var(--tinta-tenue)]">
                        {m(item.dataHora).format('DD/MM')}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--tinta)]">
                        {item.clienteNome}
                      </p>
                      <p className="truncate text-xs text-[var(--tinta-tenue)]">
                        {item.veiculoModelo} · {item.veiculoPlaca}
                      </p>
                    </div>
                    <Etiqueta tom={TOM_STATUS[item.status as StatusAgendamento]}>
                      {ROTULO_STATUS[item.status as StatusAgendamento]}
                    </Etiqueta>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* ----------------------------- Serviços ------------------------- */}
        <Cartao className="lg:col-span-2">
          <CartaoCabecalho titulo="Serviços mais executados" descricao="No mês corrente" />
          {data.servicosMaisVendidos.length === 0 ? (
            <Vazio icone={Receipt} titulo="Nenhum atendimento concluído no mês" />
          ) : (
            <CartaoCorpo className="space-y-3.5">
              {data.servicosMaisVendidos.map((servico, indice) => {
                const maximo = data.servicosMaisVendidos[0]?.quantidade ?? 1;
                const percentual = Math.round((servico.quantidade / maximo) * 100);
                return (
                  <div key={servico.nome}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-[var(--tinta)]">{servico.nome}</span>
                      <span className="numerico shrink-0 text-sm text-[var(--tinta-suave)]">
                        {servico.quantidade}× · {formatarMoeda(servico.valor)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Medidor
                        percentual={percentual}
                        tom={indice === 0 ? 'acento' : 'positivo'}
                        rotulo={servico.nome}
                      />
                    </div>
                  </div>
                );
              })}
            </CartaoCorpo>
          )}
        </Cartao>

        {/* ----------------------------- Relacionamento ------------------- */}
        <Cartao>
          <CartaoCabecalho
            titulo="Carteira de clientes"
            descricao={`${data.totalClientes} clientes ativos`}
          />
          <CartaoCorpo>
            {data.despesasCategoria.length > 0 && podeFinanceiro ? (
              <div className="mb-5 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.despesasCategoria.map((item) => ({
                        name: item.categoria,
                        value: Number(item.valor),
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke="var(--superficie-1)"
                    >
                      {data.despesasCategoria.map((_, indice) => (
                        <Cell
                          key={indice}
                          fill={CORES_GRAFICO[indice % CORES_GRAFICO.length] ?? 'var(--borda-forte)'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--superficie-2)',
                        border: '1px solid var(--borda)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      formatter={(valor: number | string) => formatarMoeda(Number(valor))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-[var(--tinta-tenue)]">
                  Despesas por categoria
                </p>
              </div>
            ) : null}

            <ul className="space-y-2.5">
              {relacionamentos.map(([chave, total]) => {
                const definicao = CATALOGO_RELACIONAMENTO[chave];
                if (definicao === undefined) return null;
                const tom =
                  definicao.tom === 'positivo'
                    ? 'positivo'
                    : definicao.tom === 'atencao'
                      ? 'atencao'
                      : definicao.tom === 'critico'
                        ? 'critico'
                        : 'neutro';
                return (
                  <li key={chave} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--tinta)]">{definicao.rotulo}</p>
                      <p className="truncate text-xs text-[var(--tinta-tenue)]">
                        {definicao.descricao}
                      </p>
                    </div>
                    <Etiqueta tom={tom}>{total}</Etiqueta>
                  </li>
                );
              })}
            </ul>
          </CartaoCorpo>
        </Cartao>
      </div>

      {/* ------------------------------- Estoque ------------------------- */}
      {podeEstoque && data.alertasEstoque.length > 0 ? (
        <Cartao className="mt-4">
          <CartaoCabecalho
            titulo="Estoque abaixo do mínimo"
            descricao="Reponha antes que falte no meio de um atendimento"
            acao={
              <Botao comoFilho variante="fantasma" tamanho="pequeno">
                <Link href="/painel/estoque">
                  Abrir estoque
                  <ArrowRight />
                </Link>
              </Botao>
            }
          />
          <CartaoCorpo className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.alertasEstoque.map((alerta) => (
              <div key={alerta.produtoId} className="superficie-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-[var(--tinta)]">
                    {alerta.nome}
                  </p>
                  <Package className="size-4 shrink-0 text-[var(--tinta-tenue)]" aria-hidden />
                </div>
                <p className="numerico mt-2 text-lg text-[var(--critico)]">
                  {formatarQuantidade(alerta.quantidadeAtual)}{' '}
                  <span className="text-xs text-[var(--tinta-tenue)]">{alerta.unidadeMedida}</span>
                </p>
                <p className="mb-2 text-xs text-[var(--tinta-tenue)]">
                  Mínimo: {formatarQuantidade(alerta.quantidadeMinima)} {alerta.unidadeMedida}
                </p>
                <Medidor percentual={alerta.percentual} tom="critico" rotulo={alerta.nome} />
              </div>
            ))}
          </CartaoCorpo>
        </Cartao>
      ) : null}

      {podeFinanceiro && Number(data.aReceber) > 0 ? (
        <Cartao className="mt-4">
          <CartaoCorpo className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-[var(--atencao)]" aria-hidden />
              <div>
                <p className="text-sm font-medium text-[var(--tinta)]">Pendente de recebimento</p>
                <p className="text-xs text-[var(--tinta-suave)]">
                  Atendimentos em andamento ou concluídos ainda não pagos
                </p>
              </div>
            </div>
            <p className="numerico text-2xl font-semibold text-[var(--atencao)]">
              {formatarMoeda(data.aReceber)}
            </p>
          </CartaoCorpo>
        </Cartao>
      ) : null}

      <p className="mt-6 text-center text-xs text-[var(--tinta-tenue)]">
        Atualizado {formatarRelativo(new Date())}
      </p>
    </>
  );
}
