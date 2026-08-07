'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import type { Papel, Plano, Recurso, StatusAssinatura } from '@/domain/plano';
import type { Acento, ModoTema } from '@/domain/tema';

export interface SessaoAtual {
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: Papel;
    ehSuperAdmin: boolean;
    ehAdministrador: boolean;
  };
  empresa: {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    telefone: string | null;
    email: string | null;
    ativo: boolean;
    plano: Plano;
    statusAssinatura: StatusAssinatura;
    valorMensalidade: string;
    proximoVencimento: string;
    motivoBloqueio: string | null;
  };
  recursos: Recurso[];
  preferencias: {
    acento: Acento;
    hex: string;
    modo: ModoTema;
    inatividadeAtiva: boolean;
    inatividadeMinutos: number;
    podePersonalizar: boolean;
  };
  notificacoesNaoLidas: number;
}

/**
 * A casca do painel ja recebe esta informacao no Server Component. Ao usa-la
 * como dado inicial, evitamos uma segunda chamada a /auth/sessao logo apos a
 * hidratacao; as demais telas continuam compartilhando a mesma chave cacheada.
 */
export function useSessao(inicial?: SessaoAtual) {
  return useQuery({
    queryKey: chaves.sessao,
    queryFn: async (): Promise<SessaoAtual> => {
      const resposta = await api.get<SessaoAtual>('/auth/sessao');
      return resposta.data;
    },
    staleTime: 60_000,
    retry: false,
    initialData: inicial,
  });
}

/** Verificação de recurso do plano no cliente, para esconder o que não existe. */
export function usePermissao(): {
  permite: (recurso: Recurso) => boolean;
  carregando: boolean;
  ehAdministrador: boolean;
  ehSuperAdmin: boolean;
} {
  const { data, isLoading } = useSessao();
  const recursos = data?.recursos ?? [];

  return {
    permite: (recurso: Recurso) => recursos.includes(recurso),
    carregando: isLoading,
    ehAdministrador: data?.usuario.ehAdministrador ?? false,
    ehSuperAdmin: data?.usuario.ehSuperAdmin ?? false,
  };
}
