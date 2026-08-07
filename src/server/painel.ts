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

  const financeiroPadrao = {
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

  const [
    financeiro,
    atendimentosMes,
    atendimentosHoje,
    linhasDeServicos,
    serie,
    totalClientes,
    alertas,
    categoriasDeDespesa,
    agendaProxima,
    relacionamento,
  ] = await Promise.all([
    podeFinanceiro ? indicadores(contexto) : Promise.resolve(financeiroPadrao),
    db
      .select({ total: count() })
      .from(agendamento)
      .where(
        and(
          eq(agendamento.empresaId, contexto.empresaId),
          between(agendamento.dataHora, inicioDoDia(inicioMes), fimDoDia(fimMes)),
        ),
      ),
    db
      .select({ total: count() })
      .from(agendamento)
      .where(
        and(
          eq(agendamento.empresaId, contexto.empresaId),
          between(agendamento.dataHora, inicioDoDia(hoje), fimDoDia(hoje)),
          inArray(agendamento.status, ['AGENDADO', 'EM_ANDAMENTO']),
        ),
      ),
    db
      .select({
        nome: servico.nome,
        quantidade: sql<number>`cast(count(*) as int)`,
        valor: sql<string>`coalesce(sum(${agendamentoServico.precoUnitario}), 0)`,
      })
      .from(agendamentoServico)
      .innerJoin(agendamento, eq(agendamento.id, agendamentoServico.agendamentoId))
      .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
      .where(
        and(
          eq(agendamento.empresaId, contexto.empresaId),
          eq(agendamento.status, 'CONCLUIDO'),
          between(agendamento.dataHora, inicioDoDia(inicioMes), fimDoDia(fimMes)),
        ),
      )
      .groupBy(servico.nome)
      .orderBy(sql`count(*) desc`)
      .limit(6),
    podeFinanceiro ? serieDeFaturamento(contexto, 6) : Promise.resolve([]),
    db
      .select({ total: count() })
      .from(cliente)
      .where(and(eq(cliente.empresaId, contexto.empresaId), eq(cliente.ativo, true))),
    podeEstoque ? alertasDeEstoque(contexto) : Promise.resolve([]),
    podeFinanceiro ? despesasPorCategoria(contexto, inicioMes, fimMes) : Promise.resolve([]),
    proximosAtendimentos(contexto, 6),
    contarPorRelacionamento(contexto),
  ]);

  const servicosMaisVendidos = linhasDeServicos.map((linha) => ({
    nome: linha.nome,
    quantidade: Number(linha.quantidade),
    valor: Dinheiro.de(linha.valor),
  }));
  const receitaAnterior = serie.length >= 2 ? (serie[serie.length - 2]?.receita ?? '0') : '0';

  return ok({
    receitaMes: financeiro.receitaMes,
    despesaMes: financeiro.despesaMes,
    lucroMes: financeiro.lucroMes,
    margem: financeiro.margem,
    ticketMedio: financeiro.ticketMedio,
    variacaoReceita: podeFinanceiro
      ? variacaoPercentual(financeiro.receitaMes, receitaAnterior)
      : null,
    atendimentosHoje: Number(atendimentosHoje[0]?.total ?? 0),
    atendimentosMes: Number(atendimentosMes[0]?.total ?? 0),
    atendimentosRecebidosMes: financeiro.atendimentosRecebidosMes,
    aReceber: financeiro.aReceber,
    serie,
    servicosMaisVendidos,
    despesasCategoria: categoriasDeDespesa,
    alertasEstoque: alertas.slice(0, 6).map((a) => ({
      produtoId: a.produtoId,
      nome: a.nome,
      quantidadeAtual: a.quantidadeAtual,
      quantidadeMinima: a.quantidadeMinima,
      unidadeMedida: a.unidadeMedida,
      percentual: a.percentual,
    })),
    agendaProxima,
    relacionamento,
    totalClientes: Number(totalClientes[0]?.total ?? 0),
  });
}
