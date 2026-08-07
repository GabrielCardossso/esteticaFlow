import { and, between, eq, inArray, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { exigirRecurso } from '@/auth/contexto';
import { db } from '@/db/client';
import {
  agendamento,
  agendamentoServico,
  cliente,
  despesa,
  empresa as tabelaEmpresa,
  formaPagamento,
  receita,
  servico,
  veiculo,
} from '@/db/schema';
import { ROTULO_STATUS } from '@/domain/agendamento';
import { permiteRecurso, type Plano } from '@/domain/plano';
import {
  limitesDoPeriodo,
  ordenarRanking,
  resolverPeriodo,
  ROTULO_FILTRO,
  type ItemRanking,
  type Periodo,
  type ResumoFinanceiro,
} from '@/domain/relatorio';
import { falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro } from '@/domain/shared/decimal';
import { hojeISO } from '@/domain/shared/tempo';
import type { FiltroRelatorio } from '@/schemas';
import { montarResumoFinanceiroDoPeriodo } from './financeiro';

export interface Relatorio {
  empresa: string;
  plano: Plano;
  filtro: string;
  filtroRotulo: string;
  periodo: Periodo;
  resumo: ResumoFinanceiro;
  detalhado: boolean;
  rankingServicos: ItemRanking[];
  despesasPorCategoria: Array<{ categoria: string; valor: string }>;
  receitasPorForma: Array<{ forma: string; valor: string }>;
  lancamentosReceita: Array<{ data: string; descricao: string; forma: string; valor: string }>;
  lancamentosDespesa: Array<{ data: string; descricao: string; categoria: string; valor: string }>;
  atendimentos: Array<{
    dataHora: string;
    cliente: string;
    veiculo: string;
    servicos: string;
    status: string;
    total: string;
  }>;
}

/**
 * Monta o relatorio gerencial. O plano Basico recebe apenas os indicadores;
 * o detalhamento por lançamento é exclusivo do plano Pro.
 */
export async function montarRelatorio(
  contexto: Contexto,
  filtro: FiltroRelatorio,
): Promise<Result<Relatorio>> {
  const acesso = exigirRecurso(contexto, 'RELATORIO_SIMPLES');
  if (!acesso.ok) return acesso;

  let empresaId = contexto.empresaId;
  let nomeEmpresa = contexto.empresa.nomeFantasia;
  let plano: Plano = contexto.empresa.plano;

  if (filtro.empresaId !== undefined && contexto.usuario.ehSuperAdmin) {
    const [alvo] = await db
      .select({
        id: tabelaEmpresa.id,
        nomeFantasia: tabelaEmpresa.nomeFantasia,
        plano: tabelaEmpresa.plano,
      })
      .from(tabelaEmpresa)
      .where(eq(tabelaEmpresa.id, filtro.empresaId))
      .limit(1);
    if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));
    empresaId = alvo.id;
    nomeEmpresa = alvo.nomeFantasia;
    plano = alvo.plano;
  }

  const detalhado = permiteRecurso(plano, contexto.papel, 'RELATORIO_DETALHADO');
  const periodo = resolverPeriodo(filtro.filtro, filtro.referencia ?? hojeISO());
  const limites = limitesDoPeriodo(periodo);

  const [resumo, concluidos] = await Promise.all([
    montarResumoFinanceiroDoPeriodo(empresaId, periodo.inicio, periodo.fim),
    db
      .select({
        id: agendamento.id,
        dataHora: agendamento.dataHora,
        total: agendamento.total,
        status: agendamento.status,
        clienteNome: cliente.nome,
        veiculoPlaca: veiculo.placa,
        veiculoModelo: veiculo.modelo,
      })
      .from(agendamento)
      .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
      .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
      .where(
        and(
          eq(agendamento.empresaId, empresaId),
          between(agendamento.dataHora, limites.inicio, limites.fim),
        ),
      )
      .orderBy(agendamento.dataHora),
  ]);

  const relatorio: Relatorio = {
    empresa: nomeEmpresa,
    plano,
    filtro: filtro.filtro,
    filtroRotulo: ROTULO_FILTRO[filtro.filtro],
    periodo,
    resumo,
    detalhado,
    rankingServicos: [],
    despesasPorCategoria: [],
    receitasPorForma: [],
    lancamentosReceita: [],
    lancamentosDespesa: [],
    atendimentos: [],
  };

  if (!detalhado) return ok(relatorio);

  const idsConcluidos = concluidos.filter((a) => a.status === 'CONCLUIDO').map((a) => a.id);

  if (idsConcluidos.length > 0) {
    const itens = await db
      .select({
        nome: servico.nome,
        quantidade: sql<number>`cast(count(*) as int)`,
        valor: sql<string>`coalesce(sum(${agendamentoServico.precoUnitario}), 0)`,
      })
      .from(agendamentoServico)
      .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
      .where(inArray(agendamentoServico.agendamentoId, idsConcluidos))
      .groupBy(servico.nome);

    relatorio.rankingServicos = ordenarRanking(
      itens.map((i) => ({
        nome: i.nome,
        quantidade: Number(i.quantidade),
        valor: Dinheiro.de(i.valor),
      })),
    );
  }

  const categorias = await db
    .select({
      categoria: despesa.categoria,
      valor: sql<string>`coalesce(sum(${despesa.valor}), 0)`,
    })
    .from(despesa)
    .where(
      and(
        eq(despesa.empresaId, empresaId),
        between(despesa.dataPagamento, periodo.inicio, periodo.fim),
      ),
    )
    .groupBy(despesa.categoria);

  relatorio.despesasPorCategoria = categorias
    .map((c) => ({ categoria: c.categoria, valor: Dinheiro.de(c.valor) }))
    .sort((a, b) => Dinheiro.comparar(b.valor, a.valor));

  const formas = await db
    .select({
      forma: formaPagamento.nome,
      valor: sql<string>`coalesce(sum(${receita.valor}), 0)`,
    })
    .from(receita)
    .innerJoin(formaPagamento, eq(formaPagamento.id, receita.formaPagamentoId))
    .where(
      and(
        eq(receita.empresaId, empresaId),
        between(receita.dataRecebimento, periodo.inicio, periodo.fim),
      ),
    )
    .groupBy(formaPagamento.nome);

  relatorio.receitasPorForma = formas
    .map((f) => ({ forma: f.forma, valor: Dinheiro.de(f.valor) }))
    .sort((a, b) => Dinheiro.comparar(b.valor, a.valor));

  const receitasDetalhe = await db
    .select({
      data: receita.dataRecebimento,
      descricao: receita.descricao,
      valor: receita.valor,
      forma: formaPagamento.nome,
    })
    .from(receita)
    .innerJoin(formaPagamento, eq(formaPagamento.id, receita.formaPagamentoId))
    .where(
      and(
        eq(receita.empresaId, empresaId),
        between(receita.dataRecebimento, periodo.inicio, periodo.fim),
      ),
    )
    .orderBy(receita.dataRecebimento);

  relatorio.lancamentosReceita = receitasDetalhe;

  const despesasDetalhe = await db
    .select({
      data: despesa.dataPagamento,
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      valor: despesa.valor,
    })
    .from(despesa)
    .where(
      and(
        eq(despesa.empresaId, empresaId),
        between(despesa.dataPagamento, periodo.inicio, periodo.fim),
      ),
    )
    .orderBy(despesa.dataPagamento);

  relatorio.lancamentosDespesa = despesasDetalhe;

  const servicosPorAgendamento = new Map<number, string[]>();
  if (concluidos.length > 0) {
    const linhas = await db
      .select({ agendamentoId: agendamentoServico.agendamentoId, nome: servico.nome })
      .from(agendamentoServico)
      .innerJoin(servico, eq(servico.id, agendamentoServico.servicoId))
      .where(
        inArray(
          agendamentoServico.agendamentoId,
          concluidos.map((a) => a.id),
        ),
      );
    for (const linha of linhas) {
      const atual = servicosPorAgendamento.get(linha.agendamentoId) ?? [];
      atual.push(linha.nome);
      servicosPorAgendamento.set(linha.agendamentoId, atual);
    }
  }

  relatorio.atendimentos = concluidos.map((a) => ({
    dataHora: new Date(a.dataHora).toISOString(),
    cliente: a.clienteNome,
    veiculo: `${a.veiculoModelo} · ${a.veiculoPlaca}`,
    servicos: (servicosPorAgendamento.get(a.id) ?? []).join(', '),
    status: ROTULO_STATUS[a.status],
    total: a.total,
  }));

  return ok(relatorio);
}
