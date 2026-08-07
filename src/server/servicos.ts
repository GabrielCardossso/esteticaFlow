import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamentoServico, categoriaServico, servico } from '@/db/schema';
import { conflito, falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro } from '@/domain/shared/decimal';
import { contemTermo } from '@/domain/shared/texto';
import type { CategoriaInput, FiltroServicos, ServicoPayload } from '@/schemas';
import { registrar } from './log';

export interface ServicoDaLista {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  tempoEstimadoMinutos: number;
  ativo: boolean;
  categoriaId: number;
  categoriaNome: string;
  vezesVendido: number;
}

export async function listarServicos(
  contexto: Contexto,
  filtro: FiltroServicos,
): Promise<Result<ServicoDaLista[]>> {
  const condicoes = [eq(servico.empresaId, contexto.empresaId)];
  if (filtro.situacao === 'ativos') condicoes.push(eq(servico.ativo, true));
  if (filtro.situacao === 'inativos') condicoes.push(eq(servico.ativo, false));
  if (filtro.categoriaId !== undefined) {
    condicoes.push(eq(servico.categoriaServicoId, filtro.categoriaId));
  }

  const [registros, vendas] = await Promise.all([
    db
      .select({
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        preco: servico.preco,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
        ativo: servico.ativo,
        categoriaId: categoriaServico.id,
        categoriaNome: categoriaServico.nome,
      })
      .from(servico)
      .innerJoin(categoriaServico, eq(categoriaServico.id, servico.categoriaServicoId))
      .where(and(...condicoes))
      .orderBy(servico.nome),
    db
      .select({ servicoId: agendamentoServico.servicoId, total: count() })
      .from(agendamentoServico)
      .where(eq(agendamentoServico.empresaId, contexto.empresaId))
      .groupBy(agendamentoServico.servicoId),
  ]);

  const mapaVendas = new Map(vendas.map((v) => [v.servicoId, Number(v.total)]));

  const lista = registros
    .filter(
      (registro) =>
        filtro.busca === '' ||
        contemTermo(registro.nome, filtro.busca) ||
        contemTermo(registro.descricao, filtro.busca) ||
        contemTermo(registro.categoriaNome, filtro.busca),
    )
    .map((registro) => ({ ...registro, vezesVendido: mapaVendas.get(registro.id) ?? 0 }));

  const ordenada = [...lista].sort((a, b) => {
    switch (filtro.ordenacao) {
      case 'preco_asc':
        return Dinheiro.comparar(a.preco, b.preco);
      case 'preco_desc':
        return Dinheiro.comparar(b.preco, a.preco);
      case 'duracao':
        return a.tempoEstimadoMinutos - b.tempoEstimadoMinutos;
      default:
        return a.nome.localeCompare(b.nome, 'pt-BR');
    }
  });

  return ok(ordenada);
}

export async function obterServico(
  contexto: Contexto,
  id: number,
): Promise<Result<typeof servico.$inferSelect>> {
  const [registro] = await db
    .select()
    .from(servico)
    .where(and(eq(servico.id, id), eq(servico.empresaId, contexto.empresaId)))
    .limit(1);
  if (registro === undefined) return falha(naoEncontrado('Serviço não encontrado.'));
  return ok(registro);
}

async function categoriaDaEmpresa(empresaId: number, categoriaId: number) {
  const [registro] = await db
    .select({ id: categoriaServico.id, ativo: categoriaServico.ativo })
    .from(categoriaServico)
    .where(and(eq(categoriaServico.id, categoriaId), eq(categoriaServico.empresaId, empresaId)))
    .limit(1);
  return registro;
}

export async function criarServico(
  contexto: Contexto,
  dados: ServicoPayload,
): Promise<Result<{ id: number }>> {
  const categoria = await categoriaDaEmpresa(contexto.empresaId, dados.categoriaServicoId);
  if (categoria === undefined) {
    return falha(naoEncontrado('Categoria de serviço não encontrada.'));
  }
  if (!categoria.ativo) {
    return falha(conflito('Esta categoria está arquivada.', 'categoriaServicoId'));
  }

  const [criado] = await db
    .insert(servico)
    .values({ ...dados, empresaId: contexto.empresaId })
    .returning({ id: servico.id });

  if (criado === undefined) return falha(naoEncontrado('Não foi possível criar o serviço.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'SERVICO_CRIADO',
    detalhes: `Serviço ${criado.id} — ${dados.nome}`,
  });

  return ok({ id: criado.id });
}

export async function atualizarServico(
  contexto: Contexto,
  id: number,
  dados: ServicoPayload,
): Promise<Result<{ id: number }>> {
  const atual = await obterServico(contexto, id);
  if (!atual.ok) return atual;

  const categoria = await categoriaDaEmpresa(contexto.empresaId, dados.categoriaServicoId);
  if (categoria === undefined) {
    return falha(naoEncontrado('Categoria de serviço não encontrada.'));
  }
  if (!categoria.ativo && categoria.id !== atual.value.categoriaServicoId) {
    return falha(conflito('Esta categoria está arquivada.', 'categoriaServicoId'));
  }

  await db
    .update(servico)
    .set(dados)
    .where(and(eq(servico.id, id), eq(servico.empresaId, contexto.empresaId)));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'SERVICO_ATUALIZADO',
    detalhes: `Serviço ${id} — ${dados.nome}`,
  });

  return ok({ id });
}

export async function alternarServicoAtivo(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const [atualizado] = await db
    .update(servico)
    .set({ ativo })
    .where(and(eq(servico.id, id), eq(servico.empresaId, contexto.empresaId)))
    .returning({ id: servico.id, ativo: servico.ativo });

  if (atualizado === undefined) return falha(naoEncontrado('Serviço não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'SERVICO_REATIVADO' : 'SERVICO_ARQUIVADO',
    detalhes: `Serviço ${id}`,
  });

  return ok(atualizado);
}

// ---------------------------------------------------------------------------
// Categorias de servico
// ---------------------------------------------------------------------------

export async function listarCategoriasServico(
  contexto: Contexto,
  incluirInativas: boolean,
): Promise<Result<Array<{ id: number; nome: string; ativo: boolean; totalServicos: number }>>> {
  const condicoes = [eq(categoriaServico.empresaId, contexto.empresaId)];
  if (!incluirInativas) condicoes.push(eq(categoriaServico.ativo, true));

  const registros = await db
    .select({
      id: categoriaServico.id,
      nome: categoriaServico.nome,
      ativo: categoriaServico.ativo,
      totalServicos: sql<number>`cast(count(${servico.id}) as int)`,
    })
    .from(categoriaServico)
    .leftJoin(servico, eq(servico.categoriaServicoId, categoriaServico.id))
    .where(and(...condicoes))
    .groupBy(categoriaServico.id)
    .orderBy(desc(categoriaServico.ativo), categoriaServico.nome);

  return ok(registros.map((r) => ({ ...r, totalServicos: Number(r.totalServicos) })));
}

export async function criarCategoriaServico(
  contexto: Contexto,
  dados: CategoriaInput,
): Promise<Result<{ id: number }>> {
  const nome = dados.nome.trim();
  const [existente] = await db
    .select({ id: categoriaServico.id })
    .from(categoriaServico)
    .where(
      and(
        eq(categoriaServico.empresaId, contexto.empresaId),
        sql`lower(${categoriaServico.nome}) = lower(${nome})`,
      ),
    )
    .limit(1);

  if (existente !== undefined) {
    return falha(conflito('Já existe uma categoria de serviço com este nome.', 'nome'));
  }

  const [criada] = await db
    .insert(categoriaServico)
    .values({ nome, empresaId: contexto.empresaId })
    .returning({ id: categoriaServico.id });

  if (criada === undefined) return falha(naoEncontrado('Não foi possível criar a categoria.'));
  return ok({ id: criada.id });
}

export async function atualizarCategoriaServico(
  contexto: Contexto,
  id: number,
  dados: CategoriaInput,
): Promise<Result<{ id: number }>> {
  const nome = dados.nome.trim();
  const [duplicada] = await db
    .select({ id: categoriaServico.id })
    .from(categoriaServico)
    .where(
      and(
        eq(categoriaServico.empresaId, contexto.empresaId),
        ne(categoriaServico.id, id),
        sql`lower(${categoriaServico.nome}) = lower(${nome})`,
      ),
    )
    .limit(1);

  if (duplicada !== undefined) {
    return falha(conflito('Já existe uma categoria de serviço com este nome.', 'nome'));
  }

  const [atualizada] = await db
    .update(categoriaServico)
    .set({ nome })
    .where(and(eq(categoriaServico.id, id), eq(categoriaServico.empresaId, contexto.empresaId)))
    .returning({ id: categoriaServico.id });

  if (atualizada === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  return ok({ id: atualizada.id });
}

export async function alternarCategoriaServicoAtiva(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const [atualizada] = await db
    .update(categoriaServico)
    .set({ ativo })
    .where(and(eq(categoriaServico.id, id), eq(categoriaServico.empresaId, contexto.empresaId)))
    .returning({ id: categoriaServico.id, ativo: categoriaServico.ativo });

  if (atualizada === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  return ok(atualizada);
}
