'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, mensagemDeErro, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import type { ClientePayload, FiltroClientes, VeiculoPayload } from '@/schemas';
import type { ClienteDaLista, DetalheCliente } from '@/server/clientes';

export function useListaDeClientes(filtro: FiltroClientes) {
  return useQuery({
    queryKey: chaves.clientes.lista(filtro),
    queryFn: async (): Promise<ClienteDaLista[]> => {
      const resposta = await api.get<ClienteDaLista[]>('/clientes', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    placeholderData: (anterior) => anterior,
  });
}

export function useCliente(id: number) {
  return useQuery({
    queryKey: chaves.clientes.item(id),
    queryFn: async (): Promise<DetalheCliente> => {
      const resposta = await api.get<DetalheCliente>(`/clientes/${id}`);
      return resposta.data;
    },
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useSalvarCliente(id?: number) {
  const cache = useQueryClient();

  return useMutation({
    mutationFn: async (dados: ClientePayload) => {
      const resposta =
        id === undefined
          ? await api.post<{ id: number }>('/clientes', dados)
          : await api.put<{ id: number }>(`/clientes/${id}`, dados);
      return resposta.data;
    },
    onSuccess: (retorno) => {
      void cache.invalidateQueries({ queryKey: chaves.clientes.todos });
      void cache.invalidateQueries({ queryKey: chaves.painel });
      toast.success(id === undefined ? 'Cliente cadastrado.' : 'Cliente atualizado.');
      return retorno;
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });
}

export function useAlternarCliente() {
  const cache = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/clientes/${id}/situacao`, { ativo });
      return { id, ativo };
    },
    onSuccess: ({ ativo }) => {
      void cache.invalidateQueries({ queryKey: chaves.clientes.todos });
      toast.success(ativo ? 'Cliente reativado.' : 'Cliente arquivado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });
}

export function useVeiculos(clienteId: number, incluirInativos = false) {
  return useQuery({
    queryKey: chaves.clientes.veiculos(clienteId, incluirInativos),
    queryFn: async () => {
      const resposta = await api.get(`/clientes/${clienteId}/veiculos`, {
        params: { todos: incluirInativos },
      });
      return resposta.data as Array<{
        id: number;
        placa: string;
        marca: string;
        modelo: string;
        cor: string | null;
        ano: number | null;
        ativo: boolean;
        observacoes: string | null;
      }>;
    },
    enabled: Number.isInteger(clienteId) && clienteId > 0,
  });
}

export function useSalvarVeiculo(id?: number) {
  const cache = useQueryClient();

  return useMutation({
    mutationFn: async (dados: VeiculoPayload) => {
      const resposta =
        id === undefined
          ? await api.post<{ id: number }>('/veiculos', dados)
          : await api.put<{ id: number }>(`/veiculos/${id}`, dados);
      return resposta.data;
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: chaves.clientes.todos });
      toast.success(id === undefined ? 'Veículo adicionado.' : 'Veículo atualizado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });
}

export function useAlternarVeiculo() {
  const cache = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/veiculos/${id}/situacao`, { ativo });
      return { ativo };
    },
    onSuccess: ({ ativo }) => {
      void cache.invalidateQueries({ queryKey: chaves.clientes.todos });
      toast.success(ativo ? 'Veículo reativado.' : 'Veículo arquivado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });
}
