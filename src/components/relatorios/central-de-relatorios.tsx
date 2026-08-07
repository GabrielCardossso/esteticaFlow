'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho } from '@/components/ui/cartao';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Indicador, Medidor } from '@/components/ui/indicador';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { FILTROS_PERIODO, ROTULO_FILTRO } from '@/domain/relatorio';
import { formatarData, formatarDataHora, hojeISO } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { usePermissao } from '@/hooks/use-sessao';
import { api, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import type { FiltroRelatorio } from '@/schemas';
import type { Relatorio } from '@/server/relatorios';

const ROTULO_CATEGORIA: Record<string, string> = {
  FIXA: 'Despesa fixa',
  VARIAVEL: 'Despesa variável',
  FORNECEDOR: 'Fornecedor',
};

export function CentralDeRelatorios() {
  const { permite } = usePermissao();
  const [filtro, setFiltro] = useState<FiltroRelatorio>({ filtro: 'MES', referencia: hojeISO() });

  const { data, isLoading, isError } = useQuery({
    queryKey: chaves.relatorios(filtro),
    queryFn: async () => {
      const resposta = await api.get<Relatorio>('/relatorios', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    enabled: permite('RELATORIO_SIMPLES'),
  });

  const parametrosExportacao = new URLSearchParams(
    paramsLimpos({ filtro: filtro.filtro, referencia: filtro.referencia }),
  ).toString();

  if (!permite('RELATORIO_SIMPLES')) {
    return (
      <>
        <CabecalhoDePagina titulo="Relatórios" />
        <Cartao>
          <Vazio icone={ScrollText} titulo="Relatórios não disponíveis no seu plano" />
        </Cartao>
      </>
    );
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Relatórios"
        descricao="Fechamento gerencial por período, pronto para exportar."
        acao={
          <>
            {permite('EXPORTACAO_PDF') ? (
              <Botao comoFilho variante="suave">
                <a href={`/api/relatorios/pdf?${parametrosExportacao}`} download>
                  <FileText />
                  PDF
                </a>
              </Botao>
            ) : null}
            {permite('EXPORTACAO_EXCEL') ? (
              <Botao comoFilho variante="acento">
                <a href={`/api/relatorios/excel?${parametrosExportacao}`} download>
                  <FileSpreadsheet />
                  Excel
                </a>
              </Botao>
            ) : null}
          </>
        }
      />

      <Cartao className="mb-4">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Selecao
            rotulo="Período"
            value={filtro.filtro}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                filtro: evento.target.value as FiltroRelatorio['filtro'],
              }))
            }
          >
            {FILTROS_PERIODO.map((periodo) => (
              <option key={periodo} value={periodo}>
                {ROTULO_FILTRO[periodo]}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Data de referência"
            type="date"
            value={filtro.referencia ?? hojeISO()}
            onChange={(evento) =>
              setFiltro((atual) => ({ ...atual, referencia: evento.target.value }))
            }
          />
          <div className="flex items-end">
            {data !== undefined ? (
              <p className="text-sm text-[var(--tinta-suave)]">
                {formatarData(data.periodo.inicio)} a {formatarData(data.periodo.fim)}
              </p>
            ) : null}
          </div>
        </div>
      </Cartao>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, indice) => (
              <Esqueleto key={indice} className="h-28" />
            ))}
          </div>
          <Esqueleto className="h-80" />
        </div>
      ) : isError || data === undefined ? (
        <Cartao>
          <Vazio icone={ScrollText} titulo="Não foi possível montar o relatório" />
        </Cartao>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador rotulo="Receita" valor={formatarMoeda(data.resumo.receita)} tom="acento" />
            <Indicador rotulo="Despesa" valor={formatarMoeda(data.resumo.despesa)} />
            <Indicador
              rotulo="Saldo"
              valor={formatarMoeda(data.resumo.saldo)}
              detalhe={
                data.resumo.margem === null ? 'Margem —' : `Margem de ${data.resumo.margem}%`
              }
              tom={Number(data.resumo.saldo) >= 0 ? 'positivo' : 'critico'}
            />
            <Indicador
              rotulo="Ticket médio"
              valor={formatarMoeda(data.resumo.ticketMedio)}
              detalhe={`${data.resumo.atendimentosRecebidos} atendimentos recebidos`}
            />
          </section>

          {!data.detalhado ? (
            <Cartao className="mt-4">
              <Vazio
                icone={Download}
                titulo="Detalhamento disponível no plano Pro"
                descricao="O plano Básico entrega os indicadores consolidados. Ranking de serviços e lançamento a lançamento fazem parte do Pro."
              />
            </Cartao>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Cartao>
                  <CartaoCabecalho titulo="Serviços mais executados" />
                  {data.rankingServicos.length === 0 ? (
                    <Vazio icone={ScrollText} titulo="Sem atendimentos concluídos" />
                  ) : (
                    <div className="space-y-3.5 p-5">
                      {data.rankingServicos.slice(0, 8).map((item, indice) => {
                        const maximo = Number(data.rankingServicos[0]?.valor ?? 1);
                        const percentual =
                          maximo === 0 ? 0 : Math.round((Number(item.valor) / maximo) * 100);
                        return (
                          <div key={item.nome}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-sm text-[var(--tinta)]">
                                {item.nome}
                              </span>
                              <span className="numerico shrink-0 text-sm text-[var(--tinta-suave)]">
                                {item.quantidade}× · {formatarMoeda(item.valor)}
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <Medidor
                                percentual={percentual}
                                tom={indice === 0 ? 'acento' : 'positivo'}
                                rotulo={item.nome}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Cartao>

                <Cartao>
                  <CartaoCabecalho titulo="Composição das despesas" />
                  {data.despesasPorCategoria.length === 0 ? (
                    <Vazio icone={ScrollText} titulo="Sem despesas no período" />
                  ) : (
                    <ul className="divide-y divide-[var(--borda)]">
                      {data.despesasPorCategoria.map((item) => (
                        <li
                          key={item.categoria}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <Etiqueta tom="neutro">
                            {ROTULO_CATEGORIA[item.categoria] ?? item.categoria}
                          </Etiqueta>
                          <span className="numerico text-sm text-[var(--tinta)]">
                            {formatarMoeda(item.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {data.receitasPorForma.length > 0 ? (
                    <>
                      <CartaoCabecalho titulo="Recebimentos por forma" className="border-t" />
                      <ul className="divide-y divide-[var(--borda)]">
                        {data.receitasPorForma.map((item) => (
                          <li
                            key={item.forma}
                            className="flex items-center justify-between gap-3 px-5 py-3"
                          >
                            <span className="text-sm text-[var(--tinta-suave)]">{item.forma}</span>
                            <span className="numerico text-sm text-[var(--tinta)]">
                              {formatarMoeda(item.valor)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </Cartao>
              </div>

              <Cartao className="mt-4">
                <CartaoCabecalho
                  titulo="Atendimentos do período"
                  descricao={`${data.atendimentos.length} registros`}
                />
                {data.atendimentos.length === 0 ? (
                  <Vazio icone={ScrollText} titulo="Nenhum atendimento no período" />
                ) : (
                  <Tabela>
                    <Cabecalho>
                      <tr>
                        <Coluna>Data</Coluna>
                        <Coluna>Cliente</Coluna>
                        <Coluna>Veículo</Coluna>
                        <Coluna>Serviços</Coluna>
                        <Coluna>Status</Coluna>
                        <Coluna numerica>Total</Coluna>
                      </tr>
                    </Cabecalho>
                    <Corpo>
                      {data.atendimentos.map((item, indice) => (
                        <Linha key={`${item.dataHora}-${indice}`}>
                          <Celula>{formatarDataHora(item.dataHora)}</Celula>
                          <Celula>{item.cliente}</Celula>
                          <Celula>{item.veiculo}</Celula>
                          <Celula>
                            <span className="line-clamp-1">{item.servicos}</span>
                          </Celula>
                          <Celula>
                            <Etiqueta tom={item.status === 'Concluído' ? 'positivo' : 'neutro'}>
                              {item.status}
                            </Etiqueta>
                          </Celula>
                          <Celula numerica>{formatarMoeda(item.total)}</Celula>
                        </Linha>
                      ))}
                    </Corpo>
                  </Tabela>
                )}
              </Cartao>
            </>
          )}
        </>
      )}
    </>
  );
}
