import { and, between, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamento, despesa, formaPagamento, receita } from '@/db/schema';
import { montarResumo, type ResumoFinanceiro } from '@/domain/relatorio';
import { falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro } from '@/domain/shared/decimal';
import { fimDoMes, hojeISO, inicioDaSemana, inicioDoMes, m, paraISO } from '@/domain/shared/tempo';
import { contemTermo } from '@/domain/shared/texto';
import type { DespesaPayload, FiltroFinanceiro, ReceitaAvulsaPayload } from '@/schemas';
import { registrar } from './log';

export interface IndicadoresFinanceiros {
  receitaDia: string;
  receitaSemana: string;
  receitaMes: string;
  receitaAno: string;
  despesaMes: string;
  lucroMes: string;
  aReceber: string;
  ticketMedio: string;
  atendimentosRecebidosMes: number;
  margem: number | null;
}

interface TotaisDeReceita {
  total: string;
  totalAtendimentos: string;
  atendimentosRecebidos: number;
}

async function obterTotaisDeReceita(
  empresaId: number,
  inicio: string,
  fim: string,
): Promise<TotaisDeReceita> {
  const [linha] = await db
    .select({
      total: sql<string>`coalesce(sum(${receita.valor}), 0)`,
      totalAtendimentos: sql<string>`coalesce(sum(${receita.valor}) filter (where ${receita.agendamentoId} is not null), 0)`,
      atendimentosRecebidos: sql<number>`cast(count(*) filter (where ${receita.agendamentoId} is not null) as int)`,
    })
    .from(receita)
    .where(and(eq(receita.empresaId, empresaId), between(receita.dataRecebimento, inicio, fim)));
  return {
    total: Dinheiro.de(linha?.total ?? '0'),
    totalAtendimentos: Dinheiro.de(linha?.totalAtendimentos ?? '0'),
    atendimentosRecebidos: Number(linha?.atendimentosRecebidos ?? 0),
  };
}

async function somarDespesas(empresaId: number, inicio: string, fim: string): Promise<string> {
  const [linha] = await db
    .select({ total: sql<string>`coalesce(sum(${despesa.valor}), 0)` })
    .from(despesa)
    .where(and(eq(despesa.empresaId, empresaId), between(despesa.dataPagamento, inicio, fim)));
  return Dinheiro.de(linha?.total ?? '0');
}

/** Regra canônica dos indicadores usados por painel, financeiro e relatórios. */
export async function montarResumoFinanceiroDoPeriodo(
  empresaId: number,
  inicio: string,
  fim: string,
): Promise<ResumoFinanceiro> {
  const [receitas, totalDespesas] = await Promise.all([
    obterTotaisDeReceita(empresaId, inicio, fim),
    somarDespesas(empresaId, inicio, fim),
  ]);

  return montarResumo(
    receitas.total,
    totalDespesas,
    receitas.totalAtendimentos,
    receitas.atendimentosRecebidos,
  );
}

async function somarAReceber(empresaId: number): Promise<string> {
  const [pendente] = await db
    .select({ total: sql<string>`coalesce(sum(${agendamento.total}), 0)` })
    .from(agendamento)
    .where(
      and(
        eq(agendamento.empresaId, empresaId),
        eq(agendamento.pago, false),
        inArray(agendamento.status, ['EM_ANDAMENTO', 'CONCLUIDO']),
      ),
    );

  return Dinheiro.de(pendente?.total ?? '0');
}

export async function indicadores(contexto: Contexto): Promise<IndicadoresFinanceiros> {
  const hoje = hojeISO();
  const semana = paraISO(inicioDaSemana(hoje));
  const mesInicio = paraISO(inicioDoMes(hoje));
  const anoInicio = paraISO(m(hoje).startOf('year'));

  const [receitas, despesaMes, aReceber] = await Promise.all([
    db
      .select({
        dia: sql<string>`coalesce(sum(${receita.valor}) filter (where ${receita.dataRecebimento} = ${hoje}), 0)`,
        semana: sql<string>`coalesce(sum(${receita.valor}) filter (where ${receita.dataRecebimento} between ${semana} and ${hoje}), 0)`,
        mes: sql<string>`coalesce(sum(${receita.valor}) filter (where ${receita.dataRecebimento} between ${mesInicio} and ${hoje}), 0)`,
        ano: sql<string>`coalesce(sum(${receita.valor}), 0)`,
        atendimentosMes: sql<string>`coalesce(sum(${receita.valor}) filter (where ${receita.agendamentoId} is not null and ${receita.dataRecebimento} between ${mesInicio} and ${hoje}), 0)`,
        quantidadeAtendimentosMes: sql<number>`cast(count(*) filter (where ${receita.agendamentoId} is not null and ${receita.dataRecebimento} between ${mesInicio} and ${hoje}) as int)`,
      })
      .from(receita)
      .where(
        and(
          eq(receita.empresaId, contexto.empresaId),
          between(receita.dataRecebimento, anoInicio, hoje),
        ),
      ),
    somarDespesas(contexto.empresaId, mesInicio, hoje),
    somarAReceber(contexto.empresaId),
  ]);

  const linha = receitas[0];
  const resumoMes = montarResumo(
    Dinheiro.de(linha?.mes ?? '0'),
    despesaMes,
    Dinheiro.de(linha?.atendimentosMes ?? '0'),
    Number(linha?.quantidadeAtendimentosMes ?? 0),
  );

  return {
    receitaDia: Dinheiro.de(linha?.dia ?? '0'),
    receitaSemana: Dinheiro.de(linha?.semana ?? '0'),
    receitaMes: resumoMes.receita,
    receitaAno: Dinheiro.de(linha?.ano ?? '0'),
    despesaMes: resumoMes.despesa,
    lucroMes: resumoMes.saldo,
    aReceber,
    ticketMedio: resumoMes.ticketMedio,
    atendimentosRecebidosMes: resumoMes.atendimentosRecebidos,
    margem: resumoMes.margem,
  };
}

export interface LancamentoFinanceiro {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  descricao: string;
  categoria: string;
  valor: string;
  data: string;
}

export async function listarLancamentos(
  contexto: Contexto,
  filtro: FiltroFinanceiro,
): Promise<
  Result<{ lancamentos: LancamentoFinanceiro[]; inicio: string; fim: string; saldo: string }>
> {
  const hoje = hojeISO();
  const inicio = filtro.inicio ?? paraISO(inicioDoMes(hoje));
  const fimBruto = filtro.fim ?? paraISO(fimDoMes(hoje));
  const fim = m(fimBruto).isBefore(m(inicio)) ? inicio : fimBruto;

  const entradasPromise =
    filtro.tipo === 'saidas'
      ? Promise.resolve([])
      : db
          .select({
            id: receita.id,
            descricao: receita.descricao,
            valor: receita.valor,
            data: receita.dataRecebimento,
            forma: formaPagamento.nome,
          })
          .from(receita)
          .leftJoin(formaPagamento, eq(formaPagamento.id, receita.formaPagamentoId))
          .where(
            and(
              eq(receita.empresaId, contexto.empresaId),
              between(receita.dataRecebimento, inicio, fim),
            ),
          )
          .orderBy(desc(receita.dataRecebimento));

  const saidasPromise =
    filtro.tipo === 'entradas'
      ? Promise.resolve([])
      : db
          .select({
            id: despesa.id,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: despesa.dataPagamento,
            categoria: despesa.categoria,
          })
          .from(despesa)
          .where(
            and(
              eq(despesa.empresaId, contexto.empresaId),
              between(despesa.dataPagamento, inicio, fim),
            ),
          )
          .orderBy(desc(despesa.dataPagamento));

  const [entradas, saidas] = await Promise.all([entradasPromise, saidasPromise]);
  const lancamentos: LancamentoFinanceiro[] = [
    ...entradas.map((entrada) => ({
      id: entrada.id,
      tipo: 'ENTRADA' as const,
      descricao: entrada.descricao,
      categoria: entrada.forma ?? 'Recebimento',
      valor: entrada.valor,
      data: entrada.data,
    })),
    ...saidas.map((saida) => ({
      id: saida.id,
      tipo: 'SAIDA' as const,
      descricao: saida.descricao,
      categoria: saida.categoria,
      valor: saida.valor,
      data: saida.data,
    })),
  ];

  const filtrados = lancamentos.filter(
    (item) =>
      filtro.busca === '' ||
      contemTermo(item.descricao, filtro.busca) ||
      contemTermo(item.categoria, filtro.busca),
  );

  filtrados.sort((a, b) => b.data.localeCompare(a.data));

  const totalEntradas = Dinheiro.somar(
    ...filtrados.filter((l) => l.tipo === 'ENTRADA').map((l) => l.valor),
    '0',
  );
  const totalSaidas = Dinheiro.somar(
    ...filtrados.filter((l) => l.tipo === 'SAIDA').map((l) => l.valor),
    '0',
  );

  return ok({
    lancamentos: filtrados,
    inicio,
    fim,
    saldo: Dinheiro.subtrair(totalEntradas, totalSaidas),
  });
}

export async function registrarDespesa(
  contexto: Contexto,
  dados: DespesaPayload,
): Promise<Result<{ id: number }>> {
  const [criada] = await db
    .insert(despesa)
    .values({ ...dados, empresaId: contexto.empresaId })
    .returning({ id: despesa.id });

  if (criada === undefined) return falha(naoEncontrado('Não foi possível registrar a despesa.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'DESPESA_REGISTRADA',
    detalhes: `${dados.descricao} — ${dados.valor}`,
  });

  return ok({ id: criada.id });
}

export async function registrarReceitaAvulsa(
  contexto: Contexto,
  dados: ReceitaAvulsaPayload,
): Promise<Result<{ id: number }>> {
  const [forma] = await db
    .select({ id: formaPagamento.id })
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

  const [criada] = await db
    .insert(receita)
    .values({
      empresaId: contexto.empresaId,
      agendamentoId: null,
      formaPagamentoId: dados.formaPagamentoId,
      descricao: dados.descricao,
      valor: dados.valor,
      dataRecebimento: dados.dataRecebimento,
    })
    .returning({ id: receita.id });

  if (criada === undefined) return falha(naoEncontrado('Não foi possível registrar a receita.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'RECEITA_REGISTRADA',
    detalhes: `${dados.descricao} — ${dados.valor}`,
  });

  return ok({ id: criada.id });
}

export async function listarFormasPagamento(contexto: Contexto, incluirInativas: boolean) {
  const condicoes = [eq(formaPagamento.empresaId, contexto.empresaId)];
  if (!incluirInativas) condicoes.push(eq(formaPagamento.ativo, true));
  return db
    .select()
    .from(formaPagamento)
    .where(and(...condicoes))
    .orderBy(desc(formaPagamento.ativo), formaPagamento.nome);
}

/** Serie de faturamento dos ultimos meses, para o grafico do painel. */
export async function serieDeFaturamento(contexto: Contexto, meses = 6) {
  const referenciaInicial = m().subtract(meses - 1, 'months');
  const inicio = paraISO(inicioDoMes(referenciaInicial));
  const fim = paraISO(fimDoMes(m()));
  const mesDaReceita = sql<string>`to_char(date_trunc('month', ${receita.dataRecebimento}), 'YYYY-MM')`;
  const mesDaDespesa = sql<string>`to_char(date_trunc('month', ${despesa.dataPagamento}), 'YYYY-MM')`;

  const [receitas, despesas] = await Promise.all([
    db
      .select({ mes: mesDaReceita, total: sql<string>`coalesce(sum(${receita.valor}), 0)` })
      .from(receita)
      .where(
        and(
          eq(receita.empresaId, contexto.empresaId),
          between(receita.dataRecebimento, inicio, fim),
        ),
      )
      .groupBy(mesDaReceita),
    db
      .select({ mes: mesDaDespesa, total: sql<string>`coalesce(sum(${despesa.valor}), 0)` })
      .from(despesa)
      .where(
        and(eq(despesa.empresaId, contexto.empresaId), between(despesa.dataPagamento, inicio, fim)),
      )
      .groupBy(mesDaDespesa),
  ]);

  const receitasPorMes = new Map(receitas.map((item) => [item.mes, Dinheiro.de(item.total)]));
  const despesasPorMes = new Map(despesas.map((item) => [item.mes, Dinheiro.de(item.total)]));

  return Array.from({ length: meses }, (_, indice) => {
    const referencia = referenciaInicial.clone().add(indice, 'months');
    const chave = referencia.format('YYYY-MM');
    return {
      mes: referencia.format('MMM/YY'),
      receita: receitasPorMes.get(chave) ?? Dinheiro.zero,
      despesa: despesasPorMes.get(chave) ?? Dinheiro.zero,
    };
  });
}

export async function despesasPorCategoria(contexto: Contexto, inicio: string, fim: string) {
  const registros = await db
    .select({
      categoria: despesa.categoria,
      total: sql<string>`coalesce(sum(${despesa.valor}), 0)`,
    })
    .from(despesa)
    .where(
      and(eq(despesa.empresaId, contexto.empresaId), between(despesa.dataPagamento, inicio, fim)),
    )
    .groupBy(despesa.categoria);

  return registros.map((r) => ({ categoria: r.categoria, valor: Dinheiro.de(r.total) }));
}
