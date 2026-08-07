import { and, between, count, eq, inArray, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamento, agendamentoServico, cliente, servico } from '@/db/schema';
import { ok, type Result } from '@/domain/result';
import { variacaoPercentual } from '@/domain/relatorio';
import { Dinheiro } from '@/domain/shared/decimal';
import {
  fimDoDia,
  fimDoMes,
  hojeISO,
  inicioDoDia,
  inicioDoMes,
  paraISO,
} from '@/domain/shared/tempo';
import { proximosAtendimentos } from './agenda';
import { contarPorRelacionamento } from './clientes';
import { alertasDeEstoque } from './estoque';
import { despesasPorCategoria, indicadores, serieDeFaturamento } from './financeiro';

export interface PainelDados {
  receitaMes: string;
  despesaMes: string;
  lucroMes: string;
  margem: number | null;
  ticketMedio: string;
  variacaoReceita: number | null;
  atendimentosHoje: number;
  atendimentosMes: number;
  atendimentosRecebidosMes: number;
  aReceber: string;
  serie: Array<{ mes: string; receita: string; despesa: string }>;
  servicosMaisVendidos: Array<{ nome: string; quantidade: number; valor: string }>;
  despesasCategoria: Array<{ categoria: string; valor: string }>;
  alertasEstoque: Array<{
    produtoId: number;
    nome: string;
    quantidadeAtual: string;
    quantidadeMinima: string;
    unidadeMedida: string;
    percentual: number;
  }>;
  agendaProxima: Array<{
    id: number;
    dataHora: string;
    status: string;
    total: string;
    clienteNome: string;
    veiculoPlaca: string;
    veiculoModelo: string;
  }>;
  relacionamento: Record<string, number>;
  totalClientes: number;
}

/** Consolida todos os indicadores do mes corrente para a tela inicial. */
export async function montarPainel(contexto: Contexto): Promise<Result<PainelDados>> {
  const hoje = hojeISO();
  const inicioMes = paraISO(inicioDoMes(hoje));
  const fimMes = paraISO(fimDoMes(hoje));

  const podeFinanceiro = contexto.permite('FINANCEIRO');
  const podeEstoque = contexto.permite('ESTOQUE');

  const financeiro = podeFinanceiro
    ? await indicadores(contexto)
    : {
        receitaDia: Dinheiro.zero,
        receitaSemana: Dinheiro.zero,
        receitaMes: Dinheiro.zero,
        receitaAno: Dinheiro.zero,
        despesaMes: Dinheiro.zero,
        lucroMes: Dinheiro.zero,
        aReceber: Dinheiro.zero,
        ticketMedio: Dinheiro.zero,
        atendimentosRecebidosMes: 0,
        margem: null,
      };

  const [atendimentosMes] = await db
    .select({
      total: count(),
    })
    .from(agendamento)
    .where(
      and(
        eq(agendamento.empresaId, contexto.empresaId),
        between(agendamento.dataHora, inicioDoDia(inicioMes), fimDoDia(fimMes)),
      ),
    );

  const [atendimentosHoje] = await db
    .select({ total: count() })
    .from(agendamento)
    .where(
      and(
        eq(agendamento.empresaId, contexto.empresaId),
        between(agendamento.dataHora, inicioDoDia(hoje), fimDoDia(hoje)),
        inArray(agendamento.status, ['AGENDADO', 'EM_ANDAMENTO']),
      ),
    );

  const idsConcluidosMes = await db
    .select({ id: agendamento.id })
    .from(agendamento)
    .where(
      and(
        eq(agendamento.empresaId, contexto.empresaId),
        eq(agendamento.status, 'CONCLUIDO'),
        between(agendamento.dataHora, inicioDoDia(inicioMes), fimDoDia(fimMes)),
      ),
    );

  let servicosMaisVendidos: PainelDados['servicosMaisVendidos'] = [];
  if (idsConcluidosMes.length > 0) {
    const linhas = await db
      .select({
        nome: servico.nome,
        quantidade: sql<number>`cast(count(*) as int)`,
        valor: sql<string>`coalesce(sum(${agendamentoServico.precoUnitario}), 0)`,
      })
      .from(agendamentoServico)
      .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
      .where(
        inArray(
          agendamentoServico.agendamentoId,
          idsConcluidosMes.map((a) => a.id),
        ),
      )
      .groupBy(servico.nome)
      .orderBy(sql`count(*) desc`)
      .limit(6);

    servicosMaisVendidos = linhas.map((l) => ({
      nome: l.nome,
      quantidade: Number(l.quantidade),
      valor: Dinheiro.de(l.valor),
    }));
  }

  const serie = podeFinanceiro ? await serieDeFaturamento(contexto, 6) : [];
  const receitaAnterior = serie.length >= 2 ? (serie[serie.length - 2]?.receita ?? '0') : '0';

  const [{ total: totalClientes = 0 } = { total: 0 }] = await db
    .select({ total: count() })
    .from(cliente)
    .where(and(eq(cliente.empresaId, contexto.empresaId), eq(cliente.ativo, true)));

  const alertas = podeEstoque ? await alertasDeEstoque(contexto) : [];

  return ok({
    receitaMes: financeiro.receitaMes,
    despesaMes: financeiro.despesaMes,
    lucroMes: financeiro.lucroMes,
    margem: financeiro.margem,
    ticketMedio: financeiro.ticketMedio,
    variacaoReceita: podeFinanceiro
      ? variacaoPercentual(financeiro.receitaMes, receitaAnterior)
      : null,
    atendimentosHoje: Number(atendimentosHoje?.total ?? 0),
    atendimentosMes: Number(atendimentosMes?.total ?? 0),
    atendimentosRecebidosMes: financeiro.atendimentosRecebidosMes,
    aReceber: financeiro.aReceber,
    serie,
    servicosMaisVendidos,
    despesasCategoria: podeFinanceiro
      ? await despesasPorCategoria(contexto, inicioMes, fimMes)
      : [],
    alertasEstoque: alertas.slice(0, 6).map((a) => ({
      produtoId: a.produtoId,
      nome: a.nome,
      quantidadeAtual: a.quantidadeAtual,
      quantidadeMinima: a.quantidadeMinima,
      unidadeMedida: a.unidadeMedida,
      percentual: a.percentual,
    })),
    agendaProxima: await proximosAtendimentos(contexto, 6),
    relacionamento: await contarPorRelacionamento(contexto),
    totalClientes: Number(totalClientes),
  });
}
