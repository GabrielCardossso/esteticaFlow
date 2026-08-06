import { pgEnum } from 'drizzle-orm/pg-core';

export const papelUsuarioEnum = pgEnum('papel_usuario', [
  'SUPER_ADMIN',
  'ADMINISTRADOR',
  'FUNCIONARIO',
]);

export const planoAssinaturaEnum = pgEnum('plano_assinatura', ['BASICO', 'COMPLETO']);

export const statusAssinaturaEnum = pgEnum('status_assinatura', [
  'ATIVA',
  'EM_ATRASO',
  'BLOQUEADA',
  'CANCELADA',
]);

export const statusAgendamentoEnum = pgEnum('status_agendamento', [
  'AGENDADO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const statusSolicitacaoEnum = pgEnum('status_solicitacao', [
  'PENDENTE',
  'APROVADA',
  'REJEITADA',
]);

export const tipoNotificacaoEnum = pgEnum('tipo_notificacao', [
  'ESTOQUE_BAIXO',
  'CLIENTE_INATIVO',
  'ASSINATURA',
  'SOLICITACAO_EMPRESA',
  'SOLICITACAO_DECISAO',
  'SISTEMA',
]);

export const unidadeMedidaEnum = pgEnum('unidade_medida', ['UN', 'ML', 'L', 'KG', 'G']);

export const tipoMovimentacaoEnum = pgEnum('tipo_movimentacao', ['ENTRADA', 'SAIDA', 'AJUSTE']);

export const origemMovimentacaoEnum = pgEnum('origem_movimentacao', [
  'MANUAL',
  'AGENDAMENTO',
  'AJUSTE',
]);

export const categoriaDespesaEnum = pgEnum('categoria_despesa', [
  'FIXA',
  'VARIAVEL',
  'FORNECEDOR',
]);
