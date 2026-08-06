/**
 * Chaves de cache do React Query, centralizadas.
 * Hierarquia estável: invalidar o prefixo derruba tudo que depende dele.
 */
export const chaves = {
  sessao: ['sessao'] as const,

  painel: ['painel'] as const,

  clientes: {
    todos: ['clientes'] as const,
    lista: (filtro: Record<string, unknown>) => ['clientes', 'lista', filtro] as const,
    item: (id: number) => ['clientes', 'item', id] as const,
    veiculos: (clienteId: number, todos: boolean) =>
      ['clientes', 'veiculos', clienteId, todos] as const,
  },

  servicos: {
    todos: ['servicos'] as const,
    lista: (filtro: Record<string, unknown>) => ['servicos', 'lista', filtro] as const,
    item: (id: number) => ['servicos', 'item', id] as const,
    categorias: (todos: boolean) => ['servicos', 'categorias', todos] as const,
  },

  agenda: {
    todos: ['agenda'] as const,
    lista: (filtro: Record<string, unknown>) => ['agenda', 'lista', filtro] as const,
    item: (id: number) => ['agenda', 'item', id] as const,
    profissionais: ['agenda', 'profissionais'] as const,
  },

  estoque: {
    todos: ['estoque'] as const,
    lista: (filtro: Record<string, unknown>) => ['estoque', 'lista', filtro] as const,
    item: (id: number) => ['estoque', 'item', id] as const,
    movimentacoes: ['estoque', 'movimentacoes'] as const,
    categorias: (todos: boolean) => ['estoque', 'categorias', todos] as const,
  },

  financeiro: {
    todos: ['financeiro'] as const,
    lista: (filtro: Record<string, unknown>) => ['financeiro', 'lista', filtro] as const,
    formas: (todos: boolean) => ['financeiro', 'formas', todos] as const,
  },

  relatorios: (filtro: Record<string, unknown>) => ['relatorios', filtro] as const,

  configuracoes: ['configuracoes'] as const,

  notificacoes: ['notificacoes'] as const,

  plataforma: {
    todos: ['plataforma'] as const,
    empresas: (filtro: Record<string, unknown>) => ['plataforma', 'empresas', filtro] as const,
    solicitacoes: ['plataforma', 'solicitacoes'] as const,
    logs: (empresaId: number | null) => ['plataforma', 'logs', empresaId] as const,
  },

  busca: (termo: string) => ['busca', termo] as const,
} as const;
