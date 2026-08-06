import { diasEntre, ehAnterior, hojeISO } from './shared/tempo';

export const PLANOS = ['BASICO', 'COMPLETO'] as const;
export type Plano = (typeof PLANOS)[number];

export const RECURSOS = [
  'DASHBOARD',
  'CLIENTES',
  'SERVICOS',
  'AGENDA',
  'RELATORIO_SIMPLES',
  'RELATORIO_DETALHADO',
  'EXPORTACAO_PDF',
  'EXPORTACAO_EXCEL',
  'ESTOQUE',
  'FINANCEIRO',
  'PERSONALIZACAO_TEMA',
  'GESTAO_PLATAFORMA',
] as const;
export type Recurso = (typeof RECURSOS)[number];

export const PAPEIS = ['SUPER_ADMIN', 'ADMINISTRADOR', 'FUNCIONARIO'] as const;
export type Papel = (typeof PAPEIS)[number];

export const STATUS_ASSINATURA = ['ATIVA', 'EM_ATRASO', 'BLOQUEADA', 'CANCELADA'] as const;
export type StatusAssinatura = (typeof STATUS_ASSINATURA)[number];

interface DefinicaoPlano {
  readonly nome: string;
  readonly descricao: string;
  readonly limiteUsuarios: number;
  readonly valorMensalPadrao: string;
  readonly recursos: ReadonlySet<Recurso>;
}

const RECURSOS_BASICO: readonly Recurso[] = [
  'DASHBOARD',
  'CLIENTES',
  'SERVICOS',
  'AGENDA',
  'RELATORIO_SIMPLES',
  'EXPORTACAO_PDF',
];

const RECURSOS_COMPLETO: readonly Recurso[] = [
  ...RECURSOS_BASICO,
  'RELATORIO_DETALHADO',
  'EXPORTACAO_EXCEL',
  'ESTOQUE',
  'FINANCEIRO',
  'PERSONALIZACAO_TEMA',
];

export const CATALOGO_PLANOS: Readonly<Record<Plano, DefinicaoPlano>> = {
  BASICO: {
    nome: 'Básico',
    descricao: 'Para quem está organizando a operação pela primeira vez.',
    limiteUsuarios: 2,
    valorMensalPadrao: '59.90',
    recursos: new Set(RECURSOS_BASICO),
  },
  COMPLETO: {
    nome: 'Completo',
    descricao: 'Operação inteira sob controle, com estoque, financeiro e relatórios.',
    limiteUsuarios: 50,
    valorMensalPadrao: '119.90',
    recursos: new Set(RECURSOS_COMPLETO),
  },
};

export const ROTULO_RECURSO: Readonly<Record<Recurso, string>> = {
  DASHBOARD: 'Painel',
  CLIENTES: 'Clientes e veículos',
  SERVICOS: 'Catálogo de serviços',
  AGENDA: 'Agenda',
  RELATORIO_SIMPLES: 'Relatórios',
  RELATORIO_DETALHADO: 'Relatórios detalhados',
  EXPORTACAO_PDF: 'Exportação em PDF',
  EXPORTACAO_EXCEL: 'Exportação em Excel',
  ESTOQUE: 'Controle de estoque',
  FINANCEIRO: 'Financeiro',
  PERSONALIZACAO_TEMA: 'Personalização de tema',
  GESTAO_PLATAFORMA: 'Gestão da plataforma',
};

/** Dias de tolerancia antes de a empresa ficar elegivel a bloqueio. */
export const DIAS_TOLERANCIA = 7;

export function recursosDoPlano(plano: Plano): ReadonlySet<Recurso> {
  return CATALOGO_PLANOS[plano].recursos;
}

export function limiteDeUsuarios(plano: Plano): number {
  return CATALOGO_PLANOS[plano].limiteUsuarios;
}

/** SUPER_ADMIN atravessa o gate de plano; qualquer outro papel respeita a matriz. */
export function permiteRecurso(plano: Plano, papel: Papel, recurso: Recurso): boolean {
  if (papel === 'SUPER_ADMIN') return true;
  if (recurso === 'GESTAO_PLATAFORMA') return false;
  return recursosDoPlano(plano).has(recurso);
}

export function recursosDisponiveis(plano: Plano, papel: Papel): Recurso[] {
  if (papel === 'SUPER_ADMIN') return [...RECURSOS];
  return RECURSOS.filter((recurso) => recursosDoPlano(plano).has(recurso));
}

export function ehAdministrador(papel: Papel): boolean {
  return papel === 'SUPER_ADMIN' || papel === 'ADMINISTRADOR';
}

export function ehSuperAdmin(papel: Papel): boolean {
  return papel === 'SUPER_ADMIN';
}

// --------------------------------------------------------------------------
// Ciclo de vida da assinatura
// --------------------------------------------------------------------------

export interface SituacaoAssinatura {
  readonly ativo: boolean;
  readonly status: StatusAssinatura;
  readonly proximoVencimento: string;
}

/**
 * Recalcula o status a partir do vencimento. Empresas inativas, bloqueadas ou
 * canceladas permanecem como estao: so um ato explicito muda esses estados.
 */
export function recalcularStatus(
  situacao: SituacaoAssinatura,
  referencia: string = hojeISO(),
): StatusAssinatura {
  if (!situacao.ativo) return situacao.status;
  if (situacao.status === 'BLOQUEADA' || situacao.status === 'CANCELADA') return situacao.status;
  return ehAnterior(situacao.proximoVencimento, referencia) ? 'EM_ATRASO' : 'ATIVA';
}

export function diasEmAtraso(proximoVencimento: string, referencia: string = hojeISO()): number {
  if (!ehAnterior(proximoVencimento, referencia)) return 0;
  return diasEntre(proximoVencimento, referencia);
}

export function elegivelParaBloqueio(
  proximoVencimento: string,
  referencia: string = hojeISO(),
): boolean {
  return diasEmAtraso(proximoVencimento, referencia) > DIAS_TOLERANCIA;
}

/** Empresa em atraso ainda acessa. So bloqueio, cancelamento ou inativacao barram. */
export function podeAcessar(situacao: SituacaoAssinatura): boolean {
  return situacao.ativo && situacao.status !== 'BLOQUEADA' && situacao.status !== 'CANCELADA';
}

export function motivoDoBloqueio(situacao: SituacaoAssinatura): string | null {
  if (!situacao.ativo) return 'A empresa está inativa. Fale com a EsteticaFlow.';
  if (situacao.status === 'CANCELADA') return 'A assinatura desta empresa foi cancelada.';
  if (situacao.status === 'BLOQUEADA') {
    return 'O acesso está bloqueado por pendência na assinatura.';
  }
  return null;
}

export const ROTULO_STATUS_ASSINATURA: Readonly<Record<StatusAssinatura, string>> = {
  ATIVA: 'Ativa',
  EM_ATRASO: 'Em atraso',
  BLOQUEADA: 'Bloqueada',
  CANCELADA: 'Cancelada',
};

export const ROTULO_PAPEL: Readonly<Record<Papel, string>> = {
  SUPER_ADMIN: 'Administrador da plataforma',
  ADMINISTRADOR: 'Administrador',
  FUNCIONARIO: 'Funcionário',
};
