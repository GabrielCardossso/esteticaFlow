import { and, desc, eq, ne, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import {
  categoriaProduto,
  despesa,
  estoque,
  movimentacaoEstoque,
  produto,
  usuario,
} from '@/db/schema';
import {
  calcularCustoUnitario,
  calcularValorDaCompra,
  descricaoDaCompra,
  nivelDoEstoque,
  normalizarQuantidade,
  normalizarQuantidadeNaoNegativa,
  percentualDoEstoque,
  validarUnidadeCompativel,
  validarBaixa,
  type NivelEstoque,
  type UnidadeBase,
  type UnidadeMedida,
} from '@/domain/estoque';
import { conflito, falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro, Quantidade } from '@/domain/shared/decimal';
import { hojeISO } from '@/domain/shared/tempo';
import { contemTermo } from '@/domain/shared/texto';
import type {
  CategoriaInput,
  EntradaEstoquePayload,
  FiltroEstoque,
  ProdutoPayload,
  SaidaEstoqueInput,
} from '@/schemas';
import { registrar } from './log';

export interface ItemDeEstoque {
  produtoId: number;
  nome: string;
  /** Unidade base persistida (UN, ML ou G). */
  unidadeMedida: UnidadeBase;
  unidadeEstoque: UnidadeMedida;
  unidadeMinima: UnidadeMedida;
  categoriaId: number;
  categoriaNome: string;
  quantidadeAtual: string;
  quantidadeMinima: string;
  quantidadeEmbalagem: string;
  valorEmbalagem: string;
  custoUnitario: string;
  valorEmEstoque: string;
  nivel: NivelEstoque;
  percentual: number;
  ativo: boolean;
}

export async function listarEstoque(
  contexto: Contexto,
  filtro: FiltroEstoque,
): Promise<Result<ItemDeEstoque[]>> {
  const condicoes = [eq(estoque.empresaId, contexto.empresaId)];
  if (filtro.situacao === 'ativos') condicoes.push(eq(produto.ativo, true));
  if (filtro.situacao === 'inativos') condicoes.push(eq(produto.ativo, false));

  const registros = await db
    .select({
      produtoId: produto.id,
      nome: produto.nome,
      unidadeMedida: produto.unidadeMedida,
      unidadeEstoque: produto.unidadeExibicao,
      categoriaId: categoriaProduto.id,
      categoriaNome: categoriaProduto.nome,
      quantidadeAtual: estoque.quantidadeAtual,
      quantidadeMinima: estoque.quantidadeMinima,
      unidadeMinima: estoque.unidadeMinima,
      quantidadeEmbalagem: produto.quantidadeEmbalagem,
      valorEmbalagem: produto.valorEmbalagem,
      custoUnitario: produto.custoUnitario,
      ativo: produto.ativo,
    })
    .from(estoque)
    .innerJoin(produto, eq(produto.id, estoque.produtoId))
    .innerJoin(categoriaProduto, eq(categoriaProduto.id, produto.categoriaProdutoId))
    .where(and(...condicoes))
    .orderBy(produto.nome);

  const itens = registros
    .filter(
      (registro) =>
        filtro.busca === '' ||
        contemTermo(registro.nome, filtro.busca) ||
        contemTermo(registro.categoriaNome, filtro.busca),
    )
    .map((registro) => {
      const nivel = nivelDoEstoque(registro.quantidadeAtual, registro.quantidadeMinima);
      return {
        ...registro,
        unidadeMedida: registro.unidadeMedida as UnidadeBase,
        nivel,
        percentual: percentualDoEstoque(registro.quantidadeAtual, registro.quantidadeMinima),
        valorEmEstoque: Dinheiro.multiplicar(registro.quantidadeAtual, registro.custoUnitario),
      } satisfies ItemDeEstoque;
    })
    .filter((item) => !filtro.somenteBaixo || item.nivel !== 'SAUDAVEL');

  const ordenada = [...itens].sort((a, b) => {
    switch (filtro.ordenacao) {
      case 'saldo_asc':
        return Quantidade.comparar(a.quantidadeAtual, b.quantidadeAtual);
      case 'saldo_desc':
        return Quantidade.comparar(b.quantidadeAtual, a.quantidadeAtual);
      case 'valor':
        return Dinheiro.comparar(b.valorEmEstoque, a.valorEmEstoque);
      default:
        return a.nome.localeCompare(b.nome, 'pt-BR');
    }
  });

  return ok(ordenada);
}

export async function obterProduto(
  contexto: Contexto,
  produtoId: number,
): Promise<Result<ItemDeEstoque>> {
  const lista = await listarEstoque(contexto, {
    busca: '',
    situacao: 'todos',
    somenteBaixo: false,
    ordenacao: 'nome',
  });
  if (!lista.ok) return lista;
  const item = lista.value.find((i) => i.produtoId === produtoId);
  if (item === undefined) return falha(naoEncontrado('Produto não encontrado.'));
  return ok(item);
}

export async function criarProduto(
  contexto: Contexto,
  dados: ProdutoPayload,
): Promise<Result<{ id: number }>> {
  const [categoria] = await db
    .select({ id: categoriaProduto.id, ativo: categoriaProduto.ativo })
    .from(categoriaProduto)
    .where(
      and(
        eq(categoriaProduto.id, dados.categoriaProdutoId),
        eq(categoriaProduto.empresaId, contexto.empresaId),
      ),
    )
    .limit(1);
  if (categoria === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  if (!categoria.ativo) {
    return falha(conflito('Esta categoria está arquivada.'));
  }

  const embalagem = normalizarQuantidade(dados.quantidadeEmbalagem, dados.unidadeEstoque);
  if (!embalagem.ok) return embalagem;
  const inicial = normalizarQuantidadeNaoNegativa(
    dados.quantidadeInicial,
    dados.unidadeEstoque,
    'quantidadeInicial',
  );
  if (!inicial.ok) return inicial;
  const minimo = normalizarQuantidadeNaoNegativa(
    dados.quantidadeMinima,
    dados.unidadeMinima,
    'quantidadeMinima',
  );
  if (!minimo.ok) return minimo;
  if (embalagem.value.unidadeBase !== minimo.value.unidadeBase) {
    return falha(conflito('A unidade do alerta deve ser compatível com a unidade de estoque.'));
  }

  const custo = calcularCustoUnitario(dados.valorEmbalagem, embalagem.value.quantidade);
  if (!custo.ok) return custo;

  const valorCompraInicial = Quantidade.ehPositivo(inicial.value.quantidade)
    ? calcularValorDaCompra(
        {
          quantidadeEmbalagem: embalagem.value.quantidade,
          valorEmbalagem: dados.valorEmbalagem,
        },
        inicial.value.quantidade,
      )
    : null;

  if (valorCompraInicial !== null && !valorCompraInicial.ok) return valorCompraInicial;

  const criado = await db.transaction(async (tx) => {
    const [novo] = await tx
      .insert(produto)
      .values({
        empresaId: contexto.empresaId,
        categoriaProdutoId: dados.categoriaProdutoId,
        nome: dados.nome,
        unidadeMedida: embalagem.value.unidadeBase,
        unidadeExibicao: dados.unidadeEstoque,
        quantidadeEmbalagem: embalagem.value.quantidade,
        valorEmbalagem: dados.valorEmbalagem,
        custoUnitario: custo.value,
      })
      .returning({ id: produto.id });

    if (novo === undefined) throw new Error('Falha ao inserir produto.');

    await tx.insert(estoque).values({
      empresaId: contexto.empresaId,
      produtoId: novo.id,
      quantidadeAtual: inicial.value.quantidade,
      quantidadeMinima: minimo.value.quantidade,
      unidadeMinima: dados.unidadeMinima,
    });

    if (valorCompraInicial !== null && valorCompraInicial.ok) {
      await tx.insert(movimentacaoEstoque).values({
        empresaId: contexto.empresaId,
        produtoId: novo.id,
        usuarioId: contexto.usuario.usuarioId,
        tipo: 'ENTRADA',
        origem: 'MANUAL',
        quantidade: inicial.value.quantidade,
        unidadeMovimentacao: dados.unidadeEstoque,
        valorFinanceiro: valorCompraInicial.value,
        motivo: 'Estoque inicial',
      });

      if (Dinheiro.ehPositivo(valorCompraInicial.value)) {
        await tx.insert(despesa).values({
          empresaId: contexto.empresaId,
          descricao: descricaoDaCompra(dados.nome, dados.quantidadeInicial, dados.unidadeEstoque),
          categoria: 'FORNECEDOR',
          valor: valorCompraInicial.value,
          dataPagamento: hojeISO(),
        });
      }
    }

    return novo;
  });

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'PRODUTO_CRIADO',
    detalhes: `Produto ${criado.id} — ${dados.nome}`,
  });

  return ok({ id: criado.id });
}

/**
 * Edicao nao mexe no saldo: quantidade so muda por entrada, saida ou ajuste,
 * para que toda alteracao de estoque tenha um lancamento correspondente.
 */
export async function atualizarProduto(
  contexto: Contexto,
  produtoId: number,
  dados: ProdutoPayload,
): Promise<Result<{ id: number }>> {
  const [existente] = await db
    .select({
      id: produto.id,
      unidadeMedida: produto.unidadeMedida,
      categoriaProdutoId: produto.categoriaProdutoId,
    })
    .from(produto)
    .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)))
    .limit(1);

  if (existente === undefined) return falha(naoEncontrado('Produto não encontrado.'));

  const [categoria] = await db
    .select({ id: categoriaProduto.id, ativo: categoriaProduto.ativo })
    .from(categoriaProduto)
    .where(
      and(
        eq(categoriaProduto.id, dados.categoriaProdutoId),
        eq(categoriaProduto.empresaId, contexto.empresaId),
      ),
    )
    .limit(1);
  if (categoria === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  if (!categoria.ativo && categoria.id !== existente.categoriaProdutoId) {
    return falha(conflito('Esta categoria esta arquivada.'));
  }

  const embalagem = normalizarQuantidade(dados.quantidadeEmbalagem, dados.unidadeEstoque);
  if (!embalagem.ok) return embalagem;
  const minimo = normalizarQuantidadeNaoNegativa(
    dados.quantidadeMinima,
    dados.unidadeMinima,
    'quantidadeMinima',
  );
  if (!minimo.ok) return minimo;
  if (
    embalagem.value.unidadeBase !== existente.unidadeMedida ||
    minimo.value.unidadeBase !== existente.unidadeMedida
  ) {
    return falha(
      conflito('Não é possível mudar a dimensão de um produto que já possui estoque.'),
    );
  }

  const custo = calcularCustoUnitario(dados.valorEmbalagem, embalagem.value.quantidade);
  if (!custo.ok) return custo;

  await db.transaction(async (tx) => {
    await tx
      .update(produto)
      .set({
        categoriaProdutoId: dados.categoriaProdutoId,
        nome: dados.nome,
        unidadeExibicao: dados.unidadeEstoque,
        quantidadeEmbalagem: embalagem.value.quantidade,
        valorEmbalagem: dados.valorEmbalagem,
        custoUnitario: custo.value,
      })
      .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)));

    await tx
      .update(estoque)
      .set({ quantidadeMinima: minimo.value.quantidade, unidadeMinima: dados.unidadeMinima })
      .where(and(eq(estoque.produtoId, produtoId), eq(estoque.empresaId, contexto.empresaId)));
  });

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'PRODUTO_ATUALIZADO',
    detalhes: `Produto ${produtoId} — ${dados.nome}`,
  });

  return ok({ id: produtoId });
}

export async function alternarProdutoAtivo(
  contexto: Contexto,
  produtoId: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const [atualizado] = await db
    .update(produto)
    .set({ ativo })
    .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)))
    .returning({ id: produto.id, ativo: produto.ativo });

  if (atualizado === undefined) return falha(naoEncontrado('Produto não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'PRODUTO_REATIVADO' : 'PRODUTO_ARQUIVADO',
    detalhes: `Produto ${produtoId}`,
  });

  return ok(atualizado);
}

/**
 * Entrada de estoque. O valor lancado como despesa e proporcional ao conteudo
 * da embalagem — nunca o preco da embalagem multiplicado pelas unidades.
 */
export async function registrarEntrada(
  contexto: Contexto,
  produtoId: number,
  dados: EntradaEstoquePayload,
): Promise<Result<{ saldo: string; valor: string }>> {
  const [registro] = await db
    .select({
      id: produto.id,
      nome: produto.nome,
      ativo: produto.ativo,
      unidadeMedida: produto.unidadeMedida,
      quantidadeEmbalagem: produto.quantidadeEmbalagem,
      valorEmbalagem: produto.valorEmbalagem,
    })
    .from(produto)
    .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)))
    .limit(1);

  if (registro === undefined) return falha(naoEncontrado('Produto não encontrado.'));
  if (!registro.ativo) return falha(conflito('Não é possível movimentar um produto arquivado.'));

  const unidade = validarUnidadeCompativel(registro.unidadeMedida, dados.unidadeMedida);
  if (!unidade.ok) return unidade;
  const quantidade = normalizarQuantidade(dados.quantidade, dados.unidadeMedida);
  if (!quantidade.ok) return quantidade;

  const valor = calcularValorDaCompra(registro, quantidade.value.quantidade, dados.valorPago);
  if (!valor.ok) return valor;

  const saldo = await db.transaction(async (tx) => {
    const [linha] = await tx
      .select({ id: estoque.id, quantidadeAtual: estoque.quantidadeAtual })
      .from(estoque)
      .where(and(eq(estoque.produtoId, produtoId), eq(estoque.empresaId, contexto.empresaId)))
      .for('update')
      .limit(1);

    if (linha === undefined) throw new Error('Produto sem registro de estoque.');

    const novoSaldo = Quantidade.somar(linha.quantidadeAtual, quantidade.value.quantidade);
    await tx.update(estoque).set({ quantidadeAtual: novoSaldo }).where(eq(estoque.id, linha.id));

    await tx.insert(movimentacaoEstoque).values({
      empresaId: contexto.empresaId,
      produtoId,
      usuarioId: contexto.usuario.usuarioId,
      tipo: 'ENTRADA',
      origem: 'MANUAL',
      quantidade: quantidade.value.quantidade,
      unidadeMovimentacao: dados.unidadeMedida,
      valorFinanceiro: valor.value,
      motivo: dados.motivo ?? 'Reposição de estoque',
    });

    if (Dinheiro.ehPositivo(valor.value)) {
      await tx.insert(despesa).values({
        empresaId: contexto.empresaId,
        descricao: descricaoDaCompra(registro.nome, dados.quantidade, dados.unidadeMedida),
        categoria: 'FORNECEDOR',
        valor: valor.value,
        dataPagamento: hojeISO(),
      });
    }

    return novoSaldo;
  });

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'ESTOQUE_ENTRADA',
    detalhes: `Produto ${produtoId} — ${dados.quantidade}`,
  });

  return ok({ saldo, valor: valor.value });
}

export async function registrarSaida(
  contexto: Contexto,
  produtoId: number,
  dados: SaidaEstoqueInput,
): Promise<Result<{ saldo: string }>> {
  const [registro] = await db
    .select({
      id: produto.id,
      nome: produto.nome,
      ativo: produto.ativo,
      unidadeMedida: produto.unidadeMedida,
    })
    .from(produto)
    .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)))
    .limit(1);

  if (registro === undefined) return falha(naoEncontrado('Produto não encontrado.'));
  if (!registro.ativo) return falha(conflito('Não é possível movimentar um produto arquivado.'));

  const unidade = validarUnidadeCompativel(registro.unidadeMedida, dados.unidadeMedida);
  if (!unidade.ok) return unidade;
  const quantidade = normalizarQuantidade(dados.quantidade, dados.unidadeMedida);
  if (!quantidade.ok) return quantidade;

  const resultado = await db.transaction(async (tx) => {
    const [linha] = await tx
      .select({ id: estoque.id, quantidadeAtual: estoque.quantidadeAtual })
      .from(estoque)
      .where(and(eq(estoque.produtoId, produtoId), eq(estoque.empresaId, contexto.empresaId)))
      .for('update')
      .limit(1);

    if (linha === undefined) throw new Error('Produto sem registro de estoque.');

    const baixa = validarBaixa(linha.quantidadeAtual, quantidade.value.quantidade, registro.nome);
    if (!baixa.ok) return { erro: baixa.error } as const;

    await tx.update(estoque).set({ quantidadeAtual: baixa.value }).where(eq(estoque.id, linha.id));

    await tx.insert(movimentacaoEstoque).values({
      empresaId: contexto.empresaId,
      produtoId,
      usuarioId: contexto.usuario.usuarioId,
      tipo: 'SAIDA',
      origem: 'MANUAL',
      quantidade: quantidade.value.quantidade,
      unidadeMovimentacao: dados.unidadeMedida,
      motivo: dados.motivo ?? 'Saída manual',
    });

    return { saldo: baixa.value } as const;
  });

  if ('erro' in resultado) return falha(resultado.erro);

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'ESTOQUE_SAIDA',
    detalhes: `Produto ${produtoId} — ${quantidade}`,
  });

  return ok({ saldo: resultado.saldo });
}

export async function alterarMinimo(
  contexto: Contexto,
  produtoId: number,
  quantidadeMinima: string,
  unidadeMinima: UnidadeMedida,
): Promise<Result<{ quantidadeMinima: string; unidadeMinima: UnidadeMedida }>> {
  const [produtoDaEmpresa] = await db
    .select({ unidadeMedida: produto.unidadeMedida })
    .from(produto)
    .where(and(eq(produto.id, produtoId), eq(produto.empresaId, contexto.empresaId)))
    .limit(1);
  if (produtoDaEmpresa === undefined) return falha(naoEncontrado('Produto não encontrado.'));

  const unidade = validarUnidadeCompativel(produtoDaEmpresa.unidadeMedida, unidadeMinima, 'unidadeMinima');
  if (!unidade.ok) return unidade;
  const minimo = normalizarQuantidadeNaoNegativa(quantidadeMinima, unidadeMinima, 'quantidadeMinima');
  if (!minimo.ok) return minimo;

  const [atualizado] = await db
    .update(estoque)
    .set({ quantidadeMinima: minimo.value.quantidade, unidadeMinima })
    .where(and(eq(estoque.produtoId, produtoId), eq(estoque.empresaId, contexto.empresaId)))
    .returning({ quantidadeMinima: estoque.quantidadeMinima, unidadeMinima: estoque.unidadeMinima });

  if (atualizado === undefined) return falha(naoEncontrado('Produto não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'ESTOQUE_MINIMO_ALTERADO',
    detalhes: `Produto ${produtoId} — mínimo ${quantidadeMinima}`,
  });

  return ok(atualizado);
}

export async function listarMovimentacoes(contexto: Contexto, limite = 30) {
  const registros = await db
    .select({
      id: movimentacaoEstoque.id,
      tipo: movimentacaoEstoque.tipo,
      origem: movimentacaoEstoque.origem,
      quantidade: movimentacaoEstoque.quantidade,
      unidadeMovimentacao: movimentacaoEstoque.unidadeMovimentacao,
      valorFinanceiro: movimentacaoEstoque.valorFinanceiro,
      motivo: movimentacaoEstoque.motivo,
      ocorridoEm: movimentacaoEstoque.ocorridoEm,
      produtoNome: produto.nome,
      unidadeMedida: produto.unidadeMedida,
      unidadeEstoque: produto.unidadeExibicao,
      usuarioNome: usuario.nome,
    })
    .from(movimentacaoEstoque)
    .innerJoin(produto, eq(produto.id, movimentacaoEstoque.produtoId))
    .leftJoin(usuario, eq(usuario.id, movimentacaoEstoque.usuarioId))
    .where(eq(movimentacaoEstoque.empresaId, contexto.empresaId))
    .orderBy(desc(movimentacaoEstoque.ocorridoEm))
    .limit(limite);

  return registros.map((r) => ({ ...r, ocorridoEm: new Date(r.ocorridoEm).toISOString() }));
}

// ---------------------------------------------------------------------------
// Categorias de produto
// ---------------------------------------------------------------------------

export async function listarCategoriasProduto(contexto: Contexto, incluirInativas: boolean) {
  const condicoes = [eq(categoriaProduto.empresaId, contexto.empresaId)];
  if (!incluirInativas) condicoes.push(eq(categoriaProduto.ativo, true));

  return db
    .select({
      id: categoriaProduto.id,
      nome: categoriaProduto.nome,
      ativo: categoriaProduto.ativo,
      totalProdutos: sql<number>`cast(count(${produto.id}) as int)`,
    })
    .from(categoriaProduto)
    .leftJoin(produto, eq(produto.categoriaProdutoId, categoriaProduto.id))
    .where(and(...condicoes))
    .groupBy(categoriaProduto.id)
    .orderBy(desc(categoriaProduto.ativo), categoriaProduto.nome);
}

export async function criarCategoriaProduto(
  contexto: Contexto,
  dados: CategoriaInput,
): Promise<Result<{ id: number }>> {
  const nome = dados.nome.trim();
  const [existente] = await db
    .select({ id: categoriaProduto.id })
    .from(categoriaProduto)
    .where(
      and(
        eq(categoriaProduto.empresaId, contexto.empresaId),
        sql`lower(${categoriaProduto.nome}) = lower(${nome})`,
      ),
    )
    .limit(1);

  if (existente !== undefined) {
    return falha(conflito('Já existe uma categoria de produto com este nome.', 'nome'));
  }

  const [criada] = await db
    .insert(categoriaProduto)
    .values({ nome, empresaId: contexto.empresaId })
    .returning({ id: categoriaProduto.id });

  if (criada === undefined) return falha(naoEncontrado('Não foi possível criar a categoria.'));
  return ok({ id: criada.id });
}

export async function atualizarCategoriaProduto(
  contexto: Contexto,
  id: number,
  dados: CategoriaInput,
): Promise<Result<{ id: number }>> {
  const nome = dados.nome.trim();
  const [duplicada] = await db
    .select({ id: categoriaProduto.id })
    .from(categoriaProduto)
    .where(
      and(
        eq(categoriaProduto.empresaId, contexto.empresaId),
        ne(categoriaProduto.id, id),
        sql`lower(${categoriaProduto.nome}) = lower(${nome})`,
      ),
    )
    .limit(1);

  if (duplicada !== undefined) {
    return falha(conflito('Já existe uma categoria de produto com este nome.', 'nome'));
  }

  const [atualizada] = await db
    .update(categoriaProduto)
    .set({ nome })
    .where(and(eq(categoriaProduto.id, id), eq(categoriaProduto.empresaId, contexto.empresaId)))
    .returning({ id: categoriaProduto.id });

  if (atualizada === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  return ok({ id: atualizada.id });
}

export async function alternarCategoriaProdutoAtiva(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const [atualizada] = await db
    .update(categoriaProduto)
    .set({ ativo })
    .where(and(eq(categoriaProduto.id, id), eq(categoriaProduto.empresaId, contexto.empresaId)))
    .returning({ id: categoriaProduto.id, ativo: categoriaProduto.ativo });

  if (atualizada === undefined) return falha(naoEncontrado('Categoria não encontrada.'));
  return ok(atualizada);
}

/** Itens abaixo do minimo, usados nos alertas do painel e das notificacoes. */
export async function alertasDeEstoque(contexto: Contexto) {
  const lista = await listarEstoque(contexto, {
    busca: '',
    situacao: 'ativos',
    somenteBaixo: true,
    ordenacao: 'saldo_asc',
  });
  return lista.ok ? lista.value : [];
}
