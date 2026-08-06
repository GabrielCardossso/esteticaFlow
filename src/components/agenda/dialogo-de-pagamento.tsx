'use client';

import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui/botao';
import { Selecao } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
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
  const [forma, setForma] = useState<string>('');

  useEffect(() => {
    if (agendamentoId !== null && forma === '' && (formas?.length ?? 0) > 0) {
      setForma(String(formas?.[0]?.id ?? ''));
    }
  }, [agendamentoId, formas, forma]);

  const confirmar = () => {
    if (agendamentoId === null || forma === '') return;
    registrar.mutate(
      { id: agendamentoId, formaPagamentoId: Number(forma) },
      { onSuccess: aoFechar },
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
      descricao="O status do atendimento não muda: um serviço em andamento pode já estar quitado."
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
            Confirmar recebimento
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
        <Selecao
          rotulo="Forma de pagamento"
          obrigatorio
          value={forma}
          onChange={(evento) => setForma(evento.target.value)}
        >
          {(formas ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </Selecao>
      )}
    </Dialogo>
  );
}
