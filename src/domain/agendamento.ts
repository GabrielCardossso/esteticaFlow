import { conflito, erro, falha, ok, validacao, type FalhaDominio, type Result } from './result';
import { Dinheiro } from './shared/decimal';
import { adicionarMinutos, agoraNoMinuto, ehAnterior, haSobreposicao, m } from './shared/tempo';

export const STATUS_AGENDAMENTO = [
  'AGENDADO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export const ROTULO_STATUS: Readonly<Record<StatusAgendamento, string>> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

/** Status que ocupam um espaco na agenda para efeito de conflito. */
export const STATUS_OCUPAM_AGENDA: readonly StatusAgendamento[] = ['AGENDADO', 'EM_ANDAMENTO'];

// --------------------------------------------------------------------------
// Calculo dos totais
// --------------------------------------------------------------------------

export interface ServicoSelecionado {
  readonly id: number;
  readonly nome: string;
  readonly preco: string;
  readonly tempoEstimadoMinutos: number;
}

export interface TotaisAgendamento {
  readonly subtotal: string;
  readonly desconto: string;
  readonly total: string;
  readonly duracaoMinutos: number;
}

/**
 * Preco de cada servico e congelado no momento do agendamento: alteracoes
 * posteriores no catalogo nao reescrevem o historico financeiro.
 */
export function calcularTotais(
  servicos: readonly ServicoSelecionado[],
  descontoInformado: string | number,
): Result<TotaisAgendamento> {
  if (servicos.length === 0) {
    return falha(validacao('Selecione ao menos um serviço.', 'servicoIds'));
  }

  const idsUnicos = new Set(servicos.map((s) => s.id));
  if (idsUnicos.size !== servicos.length) {
    return falha(validacao('Não repita o mesmo serviço no agendamento.', 'servicoIds'));
  }

  const subtotal = Dinheiro.somar(...servicos.map((s) => s.preco));
  if (!Dinheiro.ehPositivo(subtotal)) {
    return falha(validacao('O subtotal do agendamento deve ser maior que zero.'));
  }

  const desconto = Dinheiro.de(descontoInformado);
  if (Dinheiro.ehNegativo(desconto)) {
    return falha(validacao('O desconto não pode ser negativo.', 'desconto'));
  }
  if (Dinheiro.comparar(desconto, subtotal) >= 0) {
    return falha(validacao('O desconto deve ser menor que o subtotal.', 'desconto'));
  }

  const duracaoMinutos = servicos.reduce((acc, s) => acc + s.tempoEstimadoMinutos, 0);

  return ok({
    subtotal,
    desconto,
    total: Dinheiro.subtrair(subtotal, desconto),
    duracaoMinutos: Math.max(1, duracaoMinutos),
  });
}

export function validarDataHora(dataHora: Date | string): Result<Date> {
  const alvo = m(dataHora).seconds(0).milliseconds(0);
  if (!alvo.isValid()) {
    return falha(validacao('Data e hora inválidas.', 'dataHora'));
  }
  if (ehAnterior(alvo, agoraNoMinuto())) {
    return falha(validacao('Não é possível agendar no passado.', 'dataHora'));
  }
  return ok(alvo.toDate());
}

// --------------------------------------------------------------------------
// Conflito de horario
// --------------------------------------------------------------------------

export interface JanelaAgendamento {
  readonly id: number;
  readonly dataHora: Date;
  readonly duracaoMinutos: number;
  readonly responsavelId: number | null;
}

export type ResultadoConflito =
  | { readonly tipo: 'LIVRE' }
  | { readonly tipo: 'BLOQUEADO'; readonly conflitanteId: number }
  | { readonly tipo: 'PRECISA_CONFIRMACAO'; readonly conflitanteId: number };

/**
 * Dois atendimentos no mesmo horario so sao proibidos quando disputam o mesmo
 * profissional. Sem responsavel definido, a sobreposicao vira um aviso que o
 * usuario pode confirmar - a box pode ter mais de uma vaga.
 */
export function avaliarConflito(
  candidato: Omit<JanelaAgendamento, 'id'>,
  existentes: readonly JanelaAgendamento[],
): ResultadoConflito {
  const inicioCandidato = candidato.dataHora;
  const fimCandidato = adicionarMinutos(inicioCandidato, Math.max(1, candidato.duracaoMinutos));

  let sobreposicaoSemResponsavel: number | null = null;

  for (const existente of existentes) {
    const inicioExistente = existente.dataHora;
    const fimExistente = adicionarMinutos(
      inicioExistente,
      Math.max(1, existente.duracaoMinutos),
    );

    if (!haSobreposicao(inicioCandidato, fimCandidato, inicioExistente, fimExistente)) {
      continue;
    }

    const mesmoProfissional =
      candidato.responsavelId !== null &&
      existente.responsavelId !== null &&
      candidato.responsavelId === existente.responsavelId;

    if (mesmoProfissional) {
      return { tipo: 'BLOQUEADO', conflitanteId: existente.id };
    }

    if (candidato.responsavelId === null && sobreposicaoSemResponsavel === null) {
      sobreposicaoSemResponsavel = existente.id;
    }
  }

  if (sobreposicaoSemResponsavel !== null) {
    return { tipo: 'PRECISA_CONFIRMACAO', conflitanteId: sobreposicaoSemResponsavel };
  }
  return { tipo: 'LIVRE' };
}

export function falhaDeConflito(resultado: ResultadoConflito): FalhaDominio | null {
  if (resultado.tipo === 'BLOQUEADO') {
    return conflito(
      'Este profissional já possui um atendimento neste horário. Escolha outro horário ou outro responsável.',
      'dataHora',
    );
  }
  if (resultado.tipo === 'PRECISA_CONFIRMACAO') {
    return erro(
      'CONFIRMACAO_NECESSARIA',
      'Já existe outro atendimento neste horário. Confirme se deseja agendar mesmo assim.',
      { detalhes: { conflitanteId: resultado.conflitanteId } },
    );
  }
  return null;
}

// --------------------------------------------------------------------------
// Maquina de estados
// --------------------------------------------------------------------------

export type AcaoAgendamento = 'INICIAR' | 'CONCLUIR' | 'CANCELAR';

const TRANSICOES: Readonly<Record<AcaoAgendamento, readonly StatusAgendamento[]>> = {
  INICIAR: ['AGENDADO'],
  CONCLUIR: ['EM_ANDAMENTO'],
  CANCELAR: ['AGENDADO', 'EM_ANDAMENTO'],
};

const DESTINO: Readonly<Record<AcaoAgendamento, StatusAgendamento>> = {
  INICIAR: 'EM_ANDAMENTO',
  CONCLUIR: 'CONCLUIDO',
  CANCELAR: 'CANCELADO',
};

export function transicionar(
  atual: StatusAgendamento,
  acao: AcaoAgendamento,
): Result<StatusAgendamento> {
  if (!TRANSICOES[acao].includes(atual)) {
    return falha(
      erro(
        'ESTADO_INVALIDO',
        `Não é possível ${ROTULO_ACAO[acao]} um atendimento ${ROTULO_STATUS[atual].toLowerCase()}.`,
      ),
    );
  }
  return ok(DESTINO[acao]);
}

export const ROTULO_ACAO: Readonly<Record<AcaoAgendamento, string>> = {
  INICIAR: 'iniciar',
  CONCLUIR: 'concluir',
  CANCELAR: 'cancelar',
};

export function podeExecutar(atual: StatusAgendamento, acao: AcaoAgendamento): boolean {
  return TRANSICOES[acao].includes(atual);
}

/** Pagamento nao muda o status: um atendimento pode ser pago em andamento. */
export function podeRegistrarPagamento(atual: StatusAgendamento, pago: boolean): boolean {
  return !pago && (atual === 'EM_ANDAMENTO' || atual === 'CONCLUIDO');
}

export function validarPagamento(
  atual: StatusAgendamento,
  pago: boolean,
): Result<true> {
  if (pago) {
    return falha(erro('ESTADO_INVALIDO', 'Este atendimento já foi pago.'));
  }
  if (atual !== 'EM_ANDAMENTO' && atual !== 'CONCLUIDO') {
    return falha(
      erro(
        'ESTADO_INVALIDO',
        'Só é possível registrar pagamento de atendimentos em andamento ou concluídos.',
      ),
    );
  }
  return ok(true);
}
