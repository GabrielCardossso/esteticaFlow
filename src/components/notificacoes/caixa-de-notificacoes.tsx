'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  CheckCheck,
  CreditCard,
  Package,
  ShieldAlert,
  UserMinus,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta, Luz, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Vazio } from '@/components/ui/vazio';
import { formatarRelativo } from '@/domain/shared/tempo';
import { api, mensagemDeErro } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import { cn } from '@/lib/utils';

interface NotificacaoDaLista {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  acaoUrl: string | null;
  criadoEm: string;
}

const ICONE: Record<string, typeof Bell> = {
  ESTOQUE_BAIXO: Package,
  CLIENTE_INATIVO: UserMinus,
  ASSINATURA: CreditCard,
  SOLICITACAO_EMPRESA: ShieldAlert,
  SOLICITACAO_DECISAO: ShieldAlert,
  SISTEMA: Bell,
};

const TOM: Record<string, TomEtiqueta> = {
  ESTOQUE_BAIXO: 'atencao',
  CLIENTE_INATIVO: 'informativo',
  ASSINATURA: 'critico',
  SOLICITACAO_EMPRESA: 'acento',
  SOLICITACAO_DECISAO: 'acento',
  SISTEMA: 'neutro',
};

const ROTULO_TIPO: Record<string, string> = {
  ESTOQUE_BAIXO: 'Estoque',
  CLIENTE_INATIVO: 'Relacionamento',
  ASSINATURA: 'Assinatura',
  SOLICITACAO_EMPRESA: 'Solicitação',
  SOLICITACAO_DECISAO: 'Solicitação',
  SISTEMA: 'Sistema',
};

export function CaixaDeNotificacoes() {
  const cache = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: chaves.notificacoes,
    queryFn: async () => {
      const resposta = await api.get<NotificacaoDaLista[]>('/notificacoes');
      return resposta.data;
    },
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.notificacoes });
    void cache.invalidateQueries({ queryKey: chaves.sessao });
  };

  const marcarUma = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notificacoes/${id}/lida`);
    },
    onSuccess: invalidar,
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const marcarTodas = useMutation({
    mutationFn: async () => {
      await api.post('/notificacoes/lidas');
    },
    onSuccess: () => {
      invalidar();
      toast.success('Tudo marcado como lido.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const naoLidas = (data ?? []).filter((item) => !item.lida).length;

  return (
    <>
      <CabecalhoDePagina
        titulo="Notificações"
        descricao="Alertas recalculados a partir do estado atual da operação."
        acao={
          naoLidas > 0 ? (
            <Botao
              variante="suave"
              onClick={() => marcarTodas.mutate()}
              carregando={marcarTodas.isPending}
            >
              <CheckCheck />
              Marcar todas como lidas
            </Botao>
          ) : undefined
        }
      />

      {isLoading ? (
        <EsqueletoDeLista linhas={5} />
      ) : (data?.length ?? 0) === 0 ? (
        <Cartao>
          <Vazio
            icone={BellOff}
            titulo="Nenhuma notificação"
            descricao="Quando houver estoque baixo, cliente sem retorno ou pendência de assinatura, o aviso aparece aqui."
          />
        </Cartao>
      ) : (
        <ul className="space-y-2.5">
          {(data ?? []).map((notificacao) => {
            const Icone = ICONE[notificacao.tipo] ?? Bell;
            const tom = TOM[notificacao.tipo] ?? 'neutro';
            return (
              <li key={notificacao.id}>
                <Cartao
                  className={cn(
                    'p-4 transition-colors',
                    notificacao.lida ? 'opacity-70' : 'border-l-2 border-l-[var(--acento-ativo)]',
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--superficie-2)]">
                      <Icone className="size-4 text-[var(--acento-ativo)]" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notificacao.lida ? <Luz tom="acento" pulsando /> : null}
                        <p className="min-w-0 truncate text-sm font-medium text-[var(--tinta)]">
                          {notificacao.titulo}
                        </p>
                        <Etiqueta tom={tom}>
                          {ROTULO_TIPO[notificacao.tipo] ?? notificacao.tipo}
                        </Etiqueta>
                      </div>

                      <p className="mt-1 whitespace-pre-line text-sm text-[var(--tinta-suave)]">
                        {notificacao.mensagem}
                      </p>

                      <p className="mt-1.5 text-xs text-[var(--tinta-tenue)]">
                        {formatarRelativo(notificacao.criadoEm)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {notificacao.acaoUrl !== null ? (
                        <Botao comoFilho variante="fantasma" tamanho="pequeno">
                          <Link href={notificacao.acaoUrl}>Abrir</Link>
                        </Botao>
                      ) : null}
                      {!notificacao.lida ? (
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          onClick={() => marcarUma.mutate(notificacao.id)}
                        >
                          Marcar lida
                        </Botao>
                      ) : null}
                    </div>
                  </div>
                </Cartao>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
