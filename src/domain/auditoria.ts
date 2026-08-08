/**
 * Catálogo de ações auditáveis e seus rótulos de exibição.
 * Vive no domínio porque é lido tanto pelo servidor quanto pela interface.
 */

export type AcaoRegistrada =
  | 'LOGIN_REALIZADO'
  | 'LOGOUT_REALIZADO'
  | 'CLIENTE_CRIADO'
  | 'CLIENTE_ATUALIZADO'
  | 'CLIENTE_ARQUIVADO'
  | 'CLIENTE_REATIVADO'
  | 'VEICULO_CRIADO'
  | 'VEICULO_ATUALIZADO'
  | 'VEICULO_ARQUIVADO'
  | 'VEICULO_REATIVADO'
  | 'SERVICO_CRIADO'
  | 'SERVICO_ATUALIZADO'
  | 'SERVICO_ARQUIVADO'
  | 'SERVICO_REATIVADO'
  | 'AGENDAMENTO_CRIADO'
  | 'AGENDAMENTO_INICIADO'
  | 'AGENDAMENTO_CONCLUIDO'
  | 'AGENDAMENTO_CANCELADO'
  | 'PAGAMENTO_REGISTRADO'
  | 'PARCELA_RECEBIDA'
  | 'PRODUTO_CRIADO'
  | 'PRODUTO_ATUALIZADO'
  | 'PRODUTO_ARQUIVADO'
  | 'PRODUTO_REATIVADO'
  | 'ESTOQUE_ENTRADA'
  | 'ESTOQUE_SAIDA'
  | 'ESTOQUE_MINIMO_ALTERADO'
  | 'DESPESA_REGISTRADA'
  | 'RECEITA_REGISTRADA'
  | 'USUARIO_CRIADO'
  | 'USUARIO_ATUALIZADO'
  | 'USUARIO_ARQUIVADO'
  | 'USUARIO_REATIVADO'
  | 'TEMA_ALTERADO'
  | 'SESSAO_CONFIGURADA'
  | 'EMPRESA_CRIADA'
  | 'EMPRESA_ATUALIZADA'
  | 'EMPRESA_BLOQUEADA'
  | 'EMPRESA_DESBLOQUEADA'
  | 'EMPRESA_ARQUIVADA'
  | 'EMPRESA_REATIVADA'
  | 'ASSINATURA_ATUALIZADA'
  | 'PAGAMENTO_ASSINATURA'
  | 'SOLICITACAO_CRIADA'
  | 'SOLICITACAO_APROVADA'
  | 'SOLICITACAO_REJEITADA';

export const ROTULO_ACAO_LOG: Readonly<Record<string, string>> = {
  LOGIN_REALIZADO: 'Entrou no sistema',
  LOGOUT_REALIZADO: 'Saiu do sistema',
  CLIENTE_CRIADO: 'Cadastrou cliente',
  CLIENTE_ATUALIZADO: 'Atualizou cliente',
  CLIENTE_ARQUIVADO: 'Arquivou cliente',
  CLIENTE_REATIVADO: 'Reativou cliente',
  VEICULO_CRIADO: 'Cadastrou veículo',
  VEICULO_ATUALIZADO: 'Atualizou veículo',
  VEICULO_ARQUIVADO: 'Arquivou veículo',
  VEICULO_REATIVADO: 'Reativou veículo',
  SERVICO_CRIADO: 'Cadastrou serviço',
  SERVICO_ATUALIZADO: 'Atualizou serviço',
  SERVICO_ARQUIVADO: 'Arquivou serviço',
  SERVICO_REATIVADO: 'Reativou serviço',
  AGENDAMENTO_CRIADO: 'Criou agendamento',
  AGENDAMENTO_INICIADO: 'Iniciou atendimento',
  AGENDAMENTO_CONCLUIDO: 'Concluiu atendimento',
  AGENDAMENTO_CANCELADO: 'Cancelou agendamento',
  PAGAMENTO_REGISTRADO: 'Registrou pagamento',
  PARCELA_RECEBIDA: 'Recebeu parcela',
  PRODUTO_CRIADO: 'Cadastrou produto',
  PRODUTO_ATUALIZADO: 'Atualizou produto',
  PRODUTO_ARQUIVADO: 'Arquivou produto',
  PRODUTO_REATIVADO: 'Reativou produto',
  ESTOQUE_ENTRADA: 'Registrou entrada de estoque',
  ESTOQUE_SAIDA: 'Registrou saída de estoque',
  ESTOQUE_MINIMO_ALTERADO: 'Alterou estoque mínimo',
  DESPESA_REGISTRADA: 'Registrou despesa',
  RECEITA_REGISTRADA: 'Registrou receita',
  USUARIO_CRIADO: 'Criou usuário',
  USUARIO_ATUALIZADO: 'Atualizou usuário',
  USUARIO_ARQUIVADO: 'Arquivou usuário',
  USUARIO_REATIVADO: 'Reativou usuário',
  TEMA_ALTERADO: 'Alterou o tema',
  SESSAO_CONFIGURADA: 'Configurou a sessão',
  EMPRESA_CRIADA: 'Criou empresa',
  EMPRESA_ATUALIZADA: 'Atualizou empresa',
  EMPRESA_BLOQUEADA: 'Bloqueou empresa',
  EMPRESA_DESBLOQUEADA: 'Desbloqueou empresa',
  EMPRESA_ARQUIVADA: 'Arquivou empresa',
  EMPRESA_REATIVADA: 'Reativou empresa',
  ASSINATURA_ATUALIZADA: 'Atualizou assinatura',
  PAGAMENTO_ASSINATURA: 'Registrou pagamento de assinatura',
  SOLICITACAO_CRIADA: 'Solicitou alteração cadastral',
  SOLICITACAO_APROVADA: 'Aprovou solicitação',
  SOLICITACAO_REJEITADA: 'Rejeitou solicitação',
};
