'use client';

import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui/botao';
import { Selecao } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
import { MAXIMO_PARCELAS } from '@/domain/financeiro';
import { useFormasDePagamento, useRegistrarPagamento } from '@/hooks/use-agenda';

export function DialogoDePagamento({
  agendamentoId,
  aoFechar,
}: {
  agendamentoId: number | null;
  aoFechar: () => void;
}) {
  const { data: formas, isLoading } = useFormasDePagamento();
  const registrar = useRegistrarPagamento();
  const [forma, setForma] = useState('');
  const [parcelas, setParcelas] = useState('1');

  useEffect(() => {
    if (agendamentoId !== null && forma === '' && (formas?.length ?? 0) > 0) {
      setForma(String(formas?.[0]?.id ?? ''));
    }
  }, [agendamentoId, formas, forma]);

  const formaSelecionada = formas?.find((item) => String(item.id) === forma);
  const exibirParcelas = formaSelecionada?.permiteParcelamento === true;

  const confirmar = () => {
    if (agendamentoId === null || forma === '') return;
    registrar.mutate(
      {
        id: agendamentoId,
        dados: {
          formaPagamentoId: Number(forma),
          parcelas: exibirParcelas ? Number(parcelas) : 1,
        },
      },
      {
        onSuccess: () => {
          setParcelas('1');
          aoFechar();
        },
      },
    );
  };

  return (
    <Dialogo
      aberto={agendamentoId !== null}
      aoMudar={(estado) => {
        if (!estado) aoFechar();
      }}
      largura="estreita"
      titulo="Registrar pagamento"
      descricao="Receba à vista ou crie um parcelamento no cartão com acompanhamento pelo financeiro."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="acento"
            onClick={confirmar}
            carregando={registrar.isPending}
            disabled={forma === ''}
          >
            {exibirParcelas && parcelas !== '1' ? 'Criar parcelamento' : 'Confirmar recebimento'}
          </Botao>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-[var(--tinta-suave)]">Carregando formas de pagamento...</p>
      ) : (formas?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--tinta-suave)]">
          Nenhuma forma de pagamento ativa. Cadastre uma em Configurações.
        </p>
      ) : (
        <div className="space-y-4">
          <Selecao
            rotulo="Forma de pagamento"
            obrigatorio
            value={forma}
            onChange={(evento) => {
              setForma(evento.target.value);
              setParcelas('1');
            }}
          >
            {(formas ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Selecao>

          {exibirParcelas ? (
            <div className="rounded-xl border border-[var(--acento-ativo)]/25 bg-[var(--acento-fraco)] p-4">
              <Selecao
                rotulo="Quantidade de parcelas"
                ajuda={
                  parcelas === '1'
                    ? 'O valor total será recebido agora.'
                    : 'A primeira parcela entra hoje; as demais ficam em Parcelas a receber.'
                }
                value={parcelas}
                onChange={(evento) => setParcelas(evento.target.value)}
              >
                {Array.from({ length: MAXIMO_PARCELAS }, (_, indice) => indice + 1).map(
                  (quantidade) => (
                    <option key={quantidade} value={quantidade}>
                      {quantidade}x {quantidade === 1 ? '(à vista)' : ''}
                    </option>
                  ),
                )}
              </Selecao>
            </div>
          ) : null}
        </div>
      )}
    </Dialogo>
  );
}
