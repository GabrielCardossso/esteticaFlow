import { and, asc, between, eq, inArray, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import {
  agendamento,
  agendamentoServico,
  cliente,
  estoque,
  formaPagamento,
  movimentacaoEstoque,
  parcelaRecebimento,
  produto,
  receita,
  servico,
  usuario,
  veiculo,
} from '@/db/schema';
import {
  avaliarConflito,
  calcularTotais,
  falhaDeConflito,
  ROTULO_STATUS,
  STATUS_OCUPAM_AGENDA,
  transicionar,
  validarDataHora,
  validarPagamento,
  type AcaoAgendamento,
  type JanelaAgendamento,
  type StatusAgendamento,
} from '@/domain/agendamento';
import { normalizarQuantidade, validarBaixa, validarUnidadeCompativel } from '@/domain/estoque';
import { dividirEmParcelas, permiteParcelamento } from '@/domain/financeiro';
import { conflito, falha, naoEncontrado, ok, validacao, type Result } from '@/domain/result';
import { Quantidade } from '@/domain/shared/decimal';
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoDia,
  inicioDoMes,
  m,
  paraISO,
} from '@/domain/shared/tempo';
import { contemTermo } from '@/domain/shared/texto';
import type {
  AgendamentoPayload,
  ConcluirPayload,
  FiltroAgenda,
  PagamentoPayload,
} from '@/schemas';
import { registrar } from './log';

export interface AgendamentoDaLista {
  id: number;
  dataHora: string;
  duracaoMinutos: number;
  status: StatusAgendamento;
  statusRotulo: string;
  subtotal: string;
  desconto: string;
  total: string;
  pago: boolean;
  parcelado: boolean;
  observacoes: string | null;
  clienteId: number;
  clienteNome: string;
  clienteTelefone: string;
  veiculoId: number;
  veiculoPlaca: string;
  veiculoModelo: string;
  responsavelId: number | null;
  responsavelNome: string | null;
  servicos: Array<{ id: number; nome: string; preco: string; minutos: number }>;
}

function intervaloDoFiltro(filtro: FiltroAgenda): { inicio: Date; fim: Date; referencia: string } {
  const referencia = filtro.data ?? hojeISO();
  const base = m(referencia);
  switch (filtro.periodo) {
    case 'SEMANA':
      return { inicio: inicioDaSemana(base), fim: fimDaSemana(base), referencia };
    case 'MES':
      return { inicio: inicioDoMes(base), fim: fimDoMes(base), referencia };
    default:
      return { inicio: inicioDoDia(base), fim: fimDoDia(base), referencia };
  }
}

async function carregarServicosDosAgendamentos(empresaId: number, ids: readonly number[]) {
  if (ids.length === 0) return new Map<number, AgendamentoDaLista['servicos']>();

  const linhas = await db
    .select({
      agendamentoId: agendamentoServico.agendamentoId,
      servicoId: agendamentoServico.servicoId,
      nome: servico.nome,
      preco: agendamentoServico.precoUnitario,
      minutos: agendamentoServico.tempoEstimadoMinutos,
    })
    .from(agendamentoServico)
    .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
    .where(
      and(
        eq(agendamentoServico.empresaId, empresaId),
        inArray(agendamentoServico.agendamentoId, [...ids]),
      ),
    )
    .orderBy(agendamentoServico.id);

  const mapa = new Map<number, AgendamentoDaLista['servicos']>();
  for (const linha of linhas) {
    const atual = mapa.get(linha.agendamentoId) ?? [];
    atual.push({
      id: linha.servicoId,
      nome: linha.nome,
      preco: linha.preco,
      minutos: Number(linha.minutos),
    });
    mapa.set(linha.agendamentoId, atual);
  }
  return mapa;
}

function prepararParcelas(valorTotal: string, quantidade: number) {
  const hoje = hojeISO();
  return dividirEmParcelas(valorTotal, quantidade).map((valor, indice) => ({
    numero: indice + 1,
    totalParcelas: quantidade,
    valor,
    dataVencimento: paraISO(m(hoje).add(indice, 'months')),
    paga: indice === 0,
    dataPagamento: indice === 0 ? hoje : null,
  }));
}

export async function listarAgenda(
  contexto: Contexto,
  filtro: FiltroAgenda,
): Promise<
  Result<{ itens: AgendamentoDaLista[]; inicio: string; fim: string; referencia: string }>
> {
  const { inicio, fim, referencia } = intervaloDoFiltro(filtro);

  const condicoes = [
    eq(agendamento.empresaId, contexto.empresaId),
    between(agendamento.dataHora, inicio, fim),
  ];
  if (filtro.status !== undefined) condicoes.push(eq(agendamento.status, filtro.status));
  if (filtro.responsavelId !== undefined) {
    condicoes.push(eq(agendamento.responsavelId, filtro.responsavelId));
  }
  if (filtro.pago === 'pagos') condicoes.push(eq(agendamento.pago, true));
  if (filtro.pago === 'pendentes') condicoes.push(eq(agendamento.pago, false));

  const registros = await db
    .select({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      duracaoMinutos: agendamento.duracaoMinutos,
      status: agendamento.status,
      subtotal: agendamento.subtotal,
      desconto: agendamento.desconto,
      total: agendamento.total,
      pago: agendamento.pago,
      parcelado: sql<boolean>`exists (
        select 1 from ${parcelaRecebimento}
        where ${parcelaRecebimento.agendamentoId} = ${agendamento.id}
          and ${parcelaRecebimento.empresaId} = ${contexto.empresaId}
      )`,
      observacoes: agendamento.observacoes,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
      veiculoId: veiculo.id,
      veiculoPlaca: veiculo.placa,
      veiculoModelo: veiculo.modelo,
      responsavelId: agendamento.responsavelId,
      responsavelNome: usuario.nome,
    })
    .from(agendamento)
    .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
    .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
    .leftJoin(usuario, eq(usuario.id, agendamento.responsavelId))
    .where(and(...condicoes))
    .orderBy(asc(agendamento.dataHora));

  const servicosPorAgendamento = await carregarServicosDosAgendamentos(
    contexto.empresaId,
    registros.map((r) => r.id),
  );

  const itens = registros
    .map((registro) => ({
      ...registro,
      dataHora: new Date(registro.dataHora).toISOString(),
      duracaoMinutos: Number(registro.duracaoMinutos),
      statusRotulo: ROTULO_STATUS[registro.status],
      servicos: servicosPorAgendamento.get(registro.id) ?? [],
    }))
    .filter((item) => {
      if (filtro.busca === '') return true;
      return (
        contemTermo(item.clienteNome, filtro.busca) ||
        contemTermo(item.veiculoPlaca, filtro.busca) ||
        contemTermo(item.veiculoModelo, filtro.busca) ||
        item.servicos.some((s) => contemTermo(s.nome, filtro.busca))
      );
    });

  return ok({
    itens,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    referencia,
  });
}

export async function obterAgendamento(
  contexto: Contexto,
  id: number,
): Promise<
  Result<AgendamentoDaLista & { receita: { valor: string; forma: string; data: string } | null }>
> {
  const [registro] = await db
    .select({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      duracaoMinutos: agendamento.duracaoMinutos,
      status: agendamento.status,
      subtotal: agendamento.subtotal,
      desconto: agendamento.desconto,
      total: agendamento.total,
      pago: agendamento.pago,
      parcelado: sql<boolean>`exists (
        select 1 from ${parcelaRecebimento}
        where ${parcelaRecebimento.agendamentoId} = ${agendamento.id}
          and ${parcelaRecebimento.empresaId} = ${contexto.empresaId}
      )`,
      observacoes: agendamento.observacoes,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
      veiculoId: veiculo.id,
      veiculoPlaca: veiculo.placa,
      veiculoModelo: veiculo.modelo,
      responsavelId: agendamento.responsavelId,
      responsavelNome: usuario.nome,
    })
    .from(agendamento)
    .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
    .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
    .leftJoin(usuario, eq(usuario.id, agendamento.responsavelId))
    .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)))
    .limit(1);

  if (registro === undefined) return falha(naoEncontrado('Agendamento não encontrado.'));

  const servicos = await carregarServicosDosAgendamentos(contexto.empresaId, [id]);

  const [pagamento] = await db
    .select({
      valor: receita.valor,
      data: receita.dataRecebimento,
      forma: formaPagamento.nome,
    })
    .from(receita)
    .innerJoin(formaPagamento, eq(formaPagamento.id, receita.formaPagamentoId))
    .where(and(eq(receita.agendamentoId, id), eq(receita.empresaId, contexto.empresaId)))
    .limit(1);

  return ok({
    ...registro,
    dataHora: new Date(registro.dataHora).toISOString(),
    duracaoMinutos: Number(registro.duracaoMinutos),
    statusRotulo: ROTULO_STATUS[registro.status],
    servicos: servicos.get(id) ?? [],
    receita: pagamento ?? null,
  });
}

/**
 * Criacao do atendimento. A transacao cobre agendamento + itens: se algo
 * falhar no meio, nao sobra agendamento sem servico.
 */
export async function criarAgendamento(
  contexto: Contexto,
  dados: AgendamentoPayload,
): Promise<Result<{ id: number }>> {
  const dataHora = validarDataHora(dados.dataHora);
  if (!dataHora.ok) return dataHora;

  const [donoVeiculo] = await db
    .select({ clienteId: veiculo.clienteId, ativo: veiculo.ativo })
    .from(veiculo)
    .where(and(eq(veiculo.id, dados.veiculoId), eq(veiculo.empresaId, contexto.empresaId)))
    .limit(1);

  if (donoVeiculo === undefined) return falha(naoEncontrado('Veículo não encontrado.'));
  if (donoVeiculo.clienteId !== dados.clienteId) {
    return falha(validacao('O veículo não pertence ao cliente selecionado.', 'veiculoId'));
  }
  if (!donoVeiculo.ativo) {
    return falha(conflito('Este veículo está arquivado.', 'veiculoId'));
  }

  const servicosSelecionados = await db
    .select({
      id: servico.id,
      nome: servico.nome,
      preco: servico.preco,
      tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
    })
    .from(servico)
    .where(
      and(
        eq(servico.empresaId, contexto.empresaId),
        eq(servico.ativo, true),
        inArray(servico.id, dados.servicoIds),
      ),
    );

  if (servicosSelecionados.length !== new Set(dados.servicoIds).size) {
    return falha(naoEncontrado('Um ou mais serviços não foram encontrados ou estão arquivados.'));
  }

  if (dados.responsavelId !== null) {
    const [profissional] = await db
      .select({ id: usuario.id })
      .from(usuario)
      .where(
        and(
          eq(usuario.id, dados.responsavelId),
          eq(usuario.empresaId, contexto.empresaId),
          eq(usuario.ativo, true),
        ),
      )
      .limit(1);
    if (profissional === undefined) return falha(naoEncontrado('Profissional não encontrado.'));
  }

  const totais = calcularTotais(servicosSelecionados, dados.desconto);
  if (!totais.ok) return totais;

  const dia = m(dataHora.value);
  const existentes = await db
    .select({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      duracaoMinutos: agendamento.duracaoMinutos,
      responsavelId: agendamento.responsavelId,
    })
    .from(agendamento)
    .where(
      and(
        eq(agendamento.empresaId, contexto.empresaId),
        inArray(agendamento.status, [...STATUS_OCUPAM_AGENDA]),
        between(agendamento.dataHora, inicioDoDia(dia), fimDoDia(dia)),
      ),
    );

  const janelas: JanelaAgendamento[] = existentes.map((e) => ({
    id: e.id,
    dataHora: new Date(e.dataHora),
    duracaoMinutos: Number(e.duracaoMinutos),
    responsavelId: e.responsavelId,
  }));

  const avaliacao = avaliarConflito(
    {
      dataHora: dataHora.value,
      duracaoMinutos: totais.value.duracaoMinutos,
      responsavelId: dados.responsavelId,
    },
    janelas,
  );

  if (avaliacao.tipo === 'BLOQUEADO') {
    const falhaConflito = falhaDeConflito(avaliacao);
    if (falhaConflito !== null) return falha(falhaConflito);
  }
  if (avaliacao.tipo === 'PRECISA_CONFIRMACAO' && !dados.confirmarConflito) {
    const falhaConflito = falhaDeConflito(avaliacao);
    if (falhaConflito !== null) return falha(falhaConflito);
  }

  const criado = await db.transaction(async (tx) => {
    const [novo] = await tx
      .insert(agendamento)
      .values({
        empresaId: contexto.empresaId,
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId,
        responsavelId: dados.responsavelId,
        dataHora: dataHora.value,
        duracaoMinutos: String(totais.value.duracaoMinutos),
        status: 'AGENDADO',
        observacoes: dados.observacoes,
        subtotal: totais.value.subtotal,
        desconto: totais.value.desconto,
        total: totais.value.total,
        pago: false,
      })
      .returning({ id: agendamento.id });

    if (novo === undefined) throw new Error('Falha ao inserir agendamento.');

    await tx.insert(agendamentoServico).values(
      servicosSelecionados.map((s) => ({
        empresaId: contexto.empresaId,
        agendamentoId: novo.id,
        servicoId: s.id,
        precoUnitario: s.preco,
        tempoEstimadoMinutos: String(s.tempoEstimadoMinutos),
      })),
    );

    return novo;
  });

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'AGENDAMENTO_CRIADO',
    detalhes: `Agendamento ${criado.id} — ${servicosSelecionados.map((s) => s.nome).join(', ')}`,
  });

  return ok({ id: criado.id });
}

export async function mudarStatus(
  contexto: Contexto,
  id: number,
  acao: AcaoAgendamento,
): Promise<Result<{ id: number; status: StatusAgendamento }>> {
  const [atual] = await db
    .select({ id: agendamento.id, status: agendamento.status })
    .from(agendamento)
    .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)))
    .limit(1);

  if (atual === undefined) return falha(naoEncontrado('Agendamento não encontrado.'));

  const destino = transicionar(atual.status, acao);
  if (!destino.ok) return destino;

  await db
    .update(agendamento)
    .set({ status: destino.value })
    .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: acao === 'INICIAR' ? 'AGENDAMENTO_INICIADO' : 'AGENDAMENTO_CANCELADO',
    detalhes: `Agendamento ${id}`,
  });

  return ok({ id, status: destino.value });
}

/**
 * Conclusao do atendimento: baixa o estoque consumido, muda o status e, se
 * houver forma de pagamento e a conta estiver aberta, registra a receita.
 * Tudo em uma transacao, com lock nas linhas de estoque.
 */
export async function concluirAgendamento(
  contexto: Contexto,
  id: number,
  dados: ConcluirPayload,
): Promise<Result<{ id: number; status: StatusAgendamento; pago: boolean }>> {
  const [atual] = await db
    .select({
      id: agendamento.id,
      status: agendamento.status,
      pago: agendamento.pago,
      total: agendamento.total,
      parcelado: sql<boolean>`exists (
        select 1 from ${parcelaRecebimento}
        where ${parcelaRecebimento.agendamentoId} = ${agendamento.id}
          and ${parcelaRecebimento.empresaId} = ${contexto.empresaId}
      )`,
    })
    .from(agendamento)
    .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)))
    .limit(1);

  if (atual === undefined) return falha(naoEncontrado('Agendamento não encontrado.'));

  const destino = transicionar(atual.status, 'CONCLUIR');
  if (!destino.ok) return destino;

  const consumosAgregados = new Map<number, ConcluirPayload['consumos']>();
  for (const consumo of dados.consumos) {
    const acumulado = consumosAgregados.get(consumo.produtoId) ?? [];
    acumulado.push(consumo);
    consumosAgregados.set(consumo.produtoId, acumulado);
  }

  if (atual.parcelado && dados.formaPagamentoId !== null) {
    return falha(conflito('Este atendimento já possui parcelas. Gerencie-as no financeiro.'));
  }

  let formaValida: { id: number; nome: string } | null = null;
  if (dados.formaPagamentoId !== null && !atual.pago && !atual.parcelado) {
    const [forma] = await db
      .select({ id: formaPagamento.id, nome: formaPagamento.nome })
      .from(formaPagamento)
      .where(
        and(
          eq(formaPagamento.id, dados.formaPagamentoId),
          eq(formaPagamento.empresaId, contexto.empresaId),
          eq(formaPagamento.ativo, true),
        ),
      )
      .limit(1);
    if (forma === undefined) return falha(naoEncontrado('Forma de pagamento não encontrada.'));
    if (dados.parcelas > 1 && !permiteParcelamento(forma.nome)) {
      return falha(validacao('Parcelamento disponível apenas para cartão de crédito.', 'parcelas'));
    }
    formaValida = forma;
  }

  let parcelasPreparadas: ReturnType<typeof prepararParcelas> | null = null;
  if (formaValida !== null && dados.parcelas > 1) {
    try {
      parcelasPreparadas = prepararParcelas(atual.total, dados.parcelas);
    } catch {
      return falha(
        validacao('O valor do atendimento não permite essa quantidade de parcelas.', 'parcelas'),
      );
    }
  }

  const nomesServicos = await db
    .select({ nome: servico.nome })
    .from(agendamentoServico)
    .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
    .where(eq(agendamentoServico.agendamentoId, id));

  const resultado = await db.transaction(async (tx) => {
    for (const [produtoId, consumos] of consumosAgregados) {
      const [saldo] = await tx
        .select({
          id: estoque.id,
          quantidadeAtual: estoque.quantidadeAtual,
          nome: produto.nome,
          unidadeMedida: produto.unidadeMedida,
          ativo: produto.ativo,
        })
        .from(estoque)
        .innerJoin(produto, eq(produto.id, estoque.produtoId))
        .where(and(eq(estoque.produtoId, produtoId), eq(estoque.empresaId, contexto.empresaId)))
        .for('update')
        .limit(1);

      if (saldo === undefined) {
        return { erro: naoEncontrado('Produto sem controle de estoque nesta empresa.') } as const;
      }
      if (!saldo.ativo)
        return { erro: conflito('Não é possível consumir um produto arquivado.') } as const;

      let quantidade = Quantidade.zero;
      for (const consumo of consumos) {
        const unidade = validarUnidadeCompativel(saldo.unidadeMedida, consumo.unidadeMedida);
        if (!unidade.ok) return { erro: unidade.error } as const;
        const normalizada = normalizarQuantidade(consumo.quantidade, consumo.unidadeMedida);
        if (!normalizada.ok) return { erro: normalizada.error } as const;
        quantidade = Quantidade.somar(quantidade, normalizada.value.quantidade);
      }

      const baixa = validarBaixa(saldo.quantidadeAtual, quantidade, saldo.nome ?? 'produto');
      if (!baixa.ok) return { erro: baixa.error } as const;

      await tx
        .update(estoque)
        .set({ quantidadeAtual: baixa.value })
        .where(eq(estoque.id, saldo.id));

      await tx.insert(movimentacaoEstoque).values({
        empresaId: contexto.empresaId,
        produtoId,
        agendamentoId: id,
        usuarioId: contexto.usuario.usuarioId,
        tipo: 'SAIDA',
        origem: 'AGENDAMENTO',
        quantidade,
        unidadeMovimentacao: saldo.unidadeMedida,
        motivo: `Consumo no atendimento ${id}`,
      });
    }

    let pago = atual.pago;
    if (formaValida !== null && !pago) {
      const descricao = `Serviços: ${nomesServicos.map((s) => s.nome).join(', ')}`;
      if (dados.parcelas > 1) {
        const criadas = await tx
          .insert(parcelaRecebimento)
          .values(
            (parcelasPreparadas ?? []).map((parcela) => ({
              ...parcela,
              empresaId: contexto.empresaId,
              agendamentoId: id,
              formaPagamentoId: formaValida.id,
            })),
          )
          .returning({
            id: parcelaRecebimento.id,
            numero: parcelaRecebimento.numero,
            totalParcelas: parcelaRecebimento.totalParcelas,
            valor: parcelaRecebimento.valor,
          });

        const primeira = criadas.find((parcela) => parcela.numero === 1);

        if (primeira === undefined) throw new Error('Falha ao criar parcelamento.');
        await tx.insert(receita).values({
          empresaId: contexto.empresaId,
          agendamentoId: id,
          parcelaRecebimentoId: primeira.id,
          formaPagamentoId: formaValida.id,
          descricao: `Parcela ${primeira.numero}/${primeira.totalParcelas} · ${descricao}`,
          valor: primeira.valor,
          dataRecebimento: hojeISO(),
        });
      } else {
        await tx.insert(receita).values({
          empresaId: contexto.empresaId,
          agendamentoId: id,
          formaPagamentoId: formaValida.id,
          descricao,
          valor: atual.total,
          dataRecebimento: hojeISO(),
        });
        pago = true;
      }
    }

    await tx
      .update(agendamento)
      .set({ status: 'CONCLUIDO', pago })
      .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)));

    return { pago } as const;
  });

  if ('erro' in resultado) return falha(resultado.erro);

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'AGENDAMENTO_CONCLUIDO',
    detalhes: `Agendamento ${id}`,
  });

  return ok({ id, status: 'CONCLUIDO', pago: resultado.pago });
}

/** Pagamento nao altera o status: um atendimento pode ser quitado em andamento. */
export async function registrarPagamento(
  contexto: Contexto,
  id: number,
  dados: PagamentoPayload,
): Promise<Result<{ id: number; pago: boolean }>> {
  const [atual] = await db
    .select({
      id: agendamento.id,
      status: agendamento.status,
      pago: agendamento.pago,
      total: agendamento.total,
      parcelado: sql<boolean>`exists (
        select 1 from ${parcelaRecebimento}
        where ${parcelaRecebimento.agendamentoId} = ${agendamento.id}
          and ${parcelaRecebimento.empresaId} = ${contexto.empresaId}
      )`,
    })
    .from(agendamento)
    .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)))
    .limit(1);

  if (atual === undefined) return falha(naoEncontrado('Agendamento não encontrado.'));

  const permitido = validarPagamento(atual.status, atual.pago);
  if (!permitido.ok) return permitido;
  if (atual.parcelado) {
    return falha(conflito('Este atendimento já possui parcelas. Gerencie-as no financeiro.'));
  }

  const [forma] = await db
    .select({ id: formaPagamento.id, nome: formaPagamento.nome })
    .from(formaPagamento)
    .where(
      and(
        eq(formaPagamento.id, dados.formaPagamentoId),
        eq(formaPagamento.empresaId, contexto.empresaId),
        eq(formaPagamento.ativo, true),
      ),
    )
    .limit(1);

  if (forma === undefined) return falha(naoEncontrado('Forma de pagamento não encontrada.'));
  if (dados.parcelas > 1 && !permiteParcelamento(forma.nome)) {
    return falha(validacao('Parcelamento disponível apenas para cartão de crédito.', 'parcelas'));
  }

  let parcelasPreparadas: ReturnType<typeof prepararParcelas> | null = null;
  if (dados.parcelas > 1) {
    try {
      parcelasPreparadas = prepararParcelas(atual.total, dados.parcelas);
    } catch {
      return falha(
        validacao('O valor do atendimento não permite essa quantidade de parcelas.', 'parcelas'),
      );
    }
  }

  const nomesServicos = await db
    .select({ nome: servico.nome })
    .from(agendamentoServico)
    .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
    .where(eq(agendamentoServico.agendamentoId, id));

  await db.transaction(async (tx) => {
    const descricao = `Serviços: ${nomesServicos.map((s) => s.nome).join(', ')}`;
    if (dados.parcelas > 1) {
      const criadas = await tx
        .insert(parcelaRecebimento)
        .values(
          (parcelasPreparadas ?? []).map((parcela) => ({
            ...parcela,
            empresaId: contexto.empresaId,
            agendamentoId: id,
            formaPagamentoId: forma.id,
          })),
        )
        .returning({
          id: parcelaRecebimento.id,
          numero: parcelaRecebimento.numero,
          totalParcelas: parcelaRecebimento.totalParcelas,
          valor: parcelaRecebimento.valor,
        });

      const primeira = criadas.find((parcela) => parcela.numero === 1);

      if (primeira === undefined) throw new Error('Falha ao criar parcelamento.');
      await tx.insert(receita).values({
        empresaId: contexto.empresaId,
        agendamentoId: id,
        parcelaRecebimentoId: primeira.id,
        formaPagamentoId: forma.id,
        descricao: `Parcela ${primeira.numero}/${primeira.totalParcelas} · ${descricao}`,
        valor: primeira.valor,
        dataRecebimento: hojeISO(),
      });
    } else {
      await tx.insert(receita).values({
        empresaId: contexto.empresaId,
        agendamentoId: id,
        formaPagamentoId: forma.id,
        descricao,
        valor: atual.total,
        dataRecebimento: hojeISO(),
      });
    }
    await tx
      .update(agendamento)
      .set({ pago: dados.parcelas === 1 })
      .where(and(eq(agendamento.id, id), eq(agendamento.empresaId, contexto.empresaId)));
  });

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'PAGAMENTO_REGISTRADO',
    detalhes: `Agendamento ${id}`,
  });

  return ok({ id, pago: dados.parcelas === 1 });
}

/** Agenda dos proximos dias, usada no painel. */
export async function proximosAtendimentos(contexto: Contexto, limite = 6) {
  const registros = await db
    .select({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      status: agendamento.status,
      total: agendamento.total,
      clienteNome: cliente.nome,
      veiculoPlaca: veiculo.placa,
      veiculoModelo: veiculo.modelo,
    })
    .from(agendamento)
    .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
    .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
    .where(
      and(
        eq(agendamento.empresaId, contexto.empresaId),
        inArray(agendamento.status, [...STATUS_OCUPAM_AGENDA]),
        between(agendamento.dataHora, inicioDoDia(hojeISO()), fimDoDia(m().add(7, 'days'))),
      ),
    )
    .orderBy(asc(agendamento.dataHora))
    .limit(limite);

  return registros.map((r) => ({ ...r, dataHora: new Date(r.dataHora).toISOString() }));
}

export async function opcoesDeVeiculos(contexto: Contexto, clienteId: number) {
  return db
    .select({
      id: veiculo.id,
      placa: veiculo.placa,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
    })
    .from(veiculo)
    .where(
      and(
        eq(veiculo.empresaId, contexto.empresaId),
        eq(veiculo.clienteId, clienteId),
        eq(veiculo.ativo, true),
      ),
    )
    .orderBy(veiculo.modelo);
}

/** Quem pode ser responsável por um atendimento: usuários ativos da empresa. */
export async function listarProfissionais(contexto: Contexto) {
  return db
    .select({ id: usuario.id, nome: usuario.nome, papel: usuario.papel })
    .from(usuario)
    .where(and(eq(usuario.empresaId, contexto.empresaId), eq(usuario.ativo, true)))
    .orderBy(usuario.nome);
}
