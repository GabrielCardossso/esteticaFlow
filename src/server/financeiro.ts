import { and, between, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamento, despesa, formaPagamento, receita } from '@/db/schema';
import { falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro } from '@/domain/shared/decimal';
import {
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoMes,
  m,
  paraISO,
} from '@/domain/shared/tempo';
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
  margem: number;
}

async function somarReceitas(empresaId: number, inicio: string, fim: string): Promise<string> {
  const [linha] = await db
    .select({ total: sql<string>`coalesce(sum(${receita.valor}), 0)` })
    .from(receita)
    .where(
      and(
        eq(receita.empresaId, empresaId),
        between(receita.dataRecebimento, inicio, fim),
      ),
    );
  return Dinheiro.de(linha?.total ?? '0');
}

async function somarDespesas(empresaId: number, inicio: string, fim: string): Promise<string> {
  const [linha] = await db
    .select({ total: sql<string>`coalesce(sum(${despesa.valor}), 0)` })
    .from(despesa)
    .where(
      and(eq(despesa.empresaId, empresaId), between(despesa.dataPagamento, inicio, fim)),
    );
  return Dinheiro.de(linha?.total ?? '0');
}

export async function indicadores(contexto: Contexto): Promise<IndicadoresFinanceiros> {
  const hoje = hojeISO();
  const semana = paraISO(inicioDaSemana(hoje));
  const mesInicio = paraISO(inicioDoMes(hoje));
  const anoInicio = paraISO(m(hoje).startOf('year'));

  const [receitaDia, receitaSemana, receitaMes, receitaAno, despesaMes, pendente] =
    await Promise.all([
      somarReceitas(contexto.empresaId, hoje, hoje),
      somarReceitas(contexto.empresaId, semana, hoje),
      somarReceitas(contexto.empresaId, mesInicio, hoje),
      somarReceitas(contexto.empresaId, anoInicio, hoje),
      somarDespesas(contexto.empresaId, mesInicio, hoje),
      db
        .select({ total: sql<string>`coalesce(sum(${agendamento.total}), 0)` })
        .from(agendamento)
        .where(
          and(
            eq(agendamento.empresaId, contexto.empresaId),
            eq(agendamento.pago, false),
            inArray(agendamento.status, ['EM_ANDAMENTO', 'CONCLUIDO']),
          ),
        ),
    ]);

  const lucroMes = Dinheiro.subtrair(receitaMes, despesaMes);
  const receitaNumero = Dinheiro.paraNumero(receitaMes);

  return {
    receitaDia,
    receitaSemana,
    receitaMes,
    receitaAno,
    despesaMes,
    lucroMes,
    aReceber: Dinheiro.de(pendente[0]?.total ?? '0'),
    margem:
      receitaNumero === 0
        ? 0
        : Number(((Dinheiro.paraNumero(lucroMes) / receitaNumero) * 100).toFixed(1)),
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
): Promise<Result<{ lancamentos: LancamentoFinanceiro[]; inicio: string; fim: string; saldo: string }>> {
  const hoje = hojeISO();
  const inicio = filtro.inicio ?? paraISO(inicioDoMes(hoje));
  const fimBruto = filtro.fim ?? paraISO(fimDoMes(hoje));
  const fim = m(fimBruto).isBefore(m(inicio)) ? inicio : fimBruto;

  const lancamentos: LancamentoFinanceiro[] = [];

  if (filtro.tipo !== 'saidas') {
    const entradas = await db
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

    for (const entrada of entradas) {
      lancamentos.push({
        id: entrada.id,
        tipo: 'ENTRADA',
        descricao: entrada.descricao,
        categoria: entrada.forma ?? 'Recebimento',
        valor: entrada.valor,
        data: entrada.data,
      });
    }
  }

  if (filtro.tipo !== 'entradas') {
    const saidas = await db
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

    for (const saida of saidas) {
      lancamentos.push({
        id: saida.id,
        tipo: 'SAIDA',
        descricao: saida.descricao,
        categoria: saida.categoria,
        valor: saida.valor,
        data: saida.data,
      });
    }
  }

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
  const serie: Array<{ mes: string; receita: string; despesa: string }> = [];
  for (let indice = meses - 1; indice >= 0; indice -= 1) {
    const referencia = m().subtract(indice, 'months');
    const inicio = paraISO(inicioDoMes(referencia));
    const fim = paraISO(fimDoMes(referencia));
    const [receitaMes, despesaMes] = await Promise.all([
      somarReceitas(contexto.empresaId, inicio, fim),
      somarDespesas(contexto.empresaId, inicio, fim),
    ]);
    serie.push({ mes: referencia.format('MMM/YY'), receita: receitaMes, despesa: despesaMes });
  }
  return serie;
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
