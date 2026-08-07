'use client';

import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
import { UNIDADES, dimensaoDaUnidade, type UnidadeMedida } from '@/domain/estoque';
import { formatarQuantidade } from '@/domain/shared/texto';
import { useConcluirAgendamento, useFormasDePagamento } from '@/hooks/use-agenda';
import { usePermissao } from '@/hooks/use-sessao';
import { api } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import type { ConcluirPayload } from '@/schemas';
import type { ItemDeEstoque } from '@/server/estoque';

interface LinhaDeConsumo {
  produtoId: string;
  quantidade: string;
  unidadeMedida: UnidadeMedida;
}

function unidadesCompativeis(unidade: UnidadeMedida): UnidadeMedida[] {
  return UNIDADES.filter((item) => dimensaoDaUnidade(item) === dimensaoDaUnidade(unidade));
}

/**
 * Conclusão do atendimento: além de mudar o status, é o momento de baixar o
 * material consumido e, se a conta estiver aberta, receber o pagamento.
 */
export function DialogoDeConclusao({
  aberto,
  aoFechar,
  agendamentoId,
  jaPago,
}: {
  aberto: boolean;
  aoFechar: () => void;
  agendamentoId: number;
  jaPago: boolean;
}) {
  const { permite } = usePermissao();
  const podeEstoque = permite('ESTOQUE');

  const concluir = useConcluirAgendamento();
  const { data: formas } = useFormasDePagamento();

  const [forma, setForma] = useState('');
  const [consumos, setConsumos] = useState<LinhaDeConsumo[]>([]);

  const { data: produtos } = useQuery({
    queryKey: chaves.estoque.lista({ contexto: 'conclusao' }),
    queryFn: async () => {
      const resposta = await api.get<ItemDeEstoque[]>('/estoque', {
        params: { situacao: 'ativos', ordenacao: 'nome' },
      });
      return resposta.data;
    },
    enabled: aberto && podeEstoque,
  });

  const confirmar = () => {
    const dados: ConcluirPayload = {
      formaPagamentoId: !jaPago && forma !== '' ? Number(forma) : null,
      consumos: consumos
        .filter((linha) => linha.produtoId !== '' && Number(linha.quantidade) > 0)
        .map((linha) => ({
          produtoId: Number(linha.produtoId),
          quantidade: linha.quantidade,
          unidadeMedida: linha.unidadeMedida,
        })),
    };

    concluir.mutate(
      { id: agendamentoId, dados },
      {
        onSuccess: () => {
          setConsumos([]);
          setForma('');
          aoFechar();
        },
      },
    );
  };

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar();
      }}
      titulo="Concluir atendimento"
      descricao="Baixe o material consumido para o estoque refletir a realidade da bancada."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="acento" onClick={confirmar} carregando={concluir.isPending}>
            Concluir atendimento
          </Botao>
        </>
      }
    >
      <div className="space-y-5">
        {!jaPago ? (
          <Selecao
            rotulo="Receber agora"
            ajuda="Deixe em branco para concluir com a conta em aberto."
            value={forma}
            onChange={(evento) => setForma(evento.target.value)}
          >
            <option value="">Não receber agora</option>
            {(formas ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Selecao>
        ) : (
          <p className="rounded-lg border border-[var(--positivo)]/30 bg-[var(--positivo-fraco)] p-3 text-sm text-[var(--positivo)]">
            Este atendimento já está pago.
          </p>
        )}

        {podeEstoque ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="rotulo-tecnico">Material consumido</span>
              <Botao
                variante="suave"
                tamanho="pequeno"
                type="button"
                onClick={() =>
                  setConsumos((atual) => [
                    ...atual,
                    { produtoId: '', quantidade: '', unidadeMedida: 'UN' },
                  ])
                }
              >
                <Plus />
                Adicionar item
              </Botao>
            </div>

            {consumos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--borda-forte)] p-4 text-center text-sm text-[var(--tinta-tenue)]">
                Nenhum material lançado. O estoque não será alterado.
              </p>
            ) : (
              <ul className="space-y-2">
                {consumos.map((linha, indice) => {
                  const produto = (produtos ?? []).find(
                    (item) => String(item.produtoId) === linha.produtoId,
                  );
                  return (
                    <li key={indice} className="flex items-end gap-2">
                      <Selecao
                        aria-label="Produto"
                        className="flex-1"
                        value={linha.produtoId}
                        onChange={(evento) =>
                          setConsumos((atual) =>
                            atual.map((item, posicao) =>
                              posicao === indice
                                ? {
                                    ...item,
                                    produtoId: evento.target.value,
                                    unidadeMedida:
                                      (produtos ?? []).find(
                                        (produto) => String(produto.produtoId) === evento.target.value,
                                      )?.unidadeEstoque ?? 'UN',
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">Selecione o produto</option>
                        {(produtos ?? []).map((item) => (
                          <option key={item.produtoId} value={item.produtoId}>
                            {item.nome} · saldo {formatarQuantidade(item.quantidadeAtual)}{' '}
                            {item.unidadeMedida}
                          </option>
                        ))}
                      </Selecao>

                      <Campo
                        aria-label="Quantidade"
                        className="w-32"
                        inputMode="decimal"
                        placeholder="0"
                        value={linha.quantidade}
                        onChange={(evento) =>
                          setConsumos((atual) =>
                            atual.map((item, posicao) =>
                              posicao === indice
                                ? { ...item, quantidade: evento.target.value }
                                : item,
                            ),
                          )
                        }
                      />

                      <Selecao
                        aria-label="Unidade"
                        className="w-20"
                        value={linha.unidadeMedida}
                        onChange={(evento) =>
                          setConsumos((atual) =>
                            atual.map((item, posicao) =>
                              posicao === indice
                                ? { ...item, unidadeMedida: evento.target.value as UnidadeMedida }
                                : item,
                            ),
                          )
                        }
                      >
                        {unidadesCompativeis(produto?.unidadeMedida ?? 'UN').map((unidade) => (
                          <option key={unidade} value={unidade}>{unidade}</option>
                        ))}
                      </Selecao>

                      <Botao
                        variante="fantasma"
                        tamanho="icone"
                        type="button"
                        aria-label="Remover item"
                        onClick={() =>
                          setConsumos((atual) => atual.filter((_, posicao) => posicao !== indice))
                        }
                      >
                        <Trash2 />
                      </Botao>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--tinta-tenue)]">
              <Minus className="size-3" aria-hidden />
              Quantidades repetidas do mesmo produto são somadas antes da baixa.
            </p>
          </div>
        ) : null}
      </div>
    </Dialogo>
  );
}
