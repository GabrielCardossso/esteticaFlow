import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { empresa } from './empresa';
import { origemMovimentacaoEnum, tipoMovimentacaoEnum, unidadeMedidaEnum } from './enums';
import { usuario } from './usuario';

export const categoriaProduto = pgTable(
  'categoria_produto',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 100 }).notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('uq_categoria_produto_empresa_nome').on(t.empresaId, t.nome)],
);

export const produto = pgTable(
  'produto',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    categoriaProdutoId: bigint('categoria_produto_id', { mode: 'number' })
      .notNull()
      .references(() => categoriaProduto.id),
    nome: varchar('nome', { length: 150 }).notNull(),
    unidadeMedida: unidadeMedidaEnum('unidade_medida').notNull(),
    /** Quantidade contida em uma embalagem fechada (ex.: 2000 ml). */
    quantidadeEmbalagem: numeric('quantidade_embalagem', { precision: 12, scale: 3 }).notNull(),
    /** Valor pago pela embalagem inteira, nao pela unidade. */
    valorEmbalagem: numeric('valor_embalagem', { precision: 12, scale: 2 }).notNull(),
    /** Derivado: valorEmbalagem / quantidadeEmbalagem. */
    custoUnitario: numeric('custo_unitario', { precision: 12, scale: 4 }).notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('ix_produto_empresa_ativo').on(t.empresaId, t.ativo),
    check('ck_produto_quantidade_embalagem', sql`${t.quantidadeEmbalagem} > 0`),
    check('ck_produto_valor_embalagem', sql`${t.valorEmbalagem} >= 0`),
    check('ck_produto_custo_unitario', sql`${t.custoUnitario} >= 0`),
  ],
);

export const estoque = pgTable(
  'estoque',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    produtoId: bigint('produto_id', { mode: 'number' })
      .notNull()
      .references(() => produto.id, { onDelete: 'cascade' }),
    quantidadeAtual: numeric('quantidade_atual', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    quantidadeMinima: numeric('quantidade_minima', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_estoque_produto').on(t.produtoId),
    index('ix_estoque_empresa').on(t.empresaId),
    check('ck_estoque_quantidade_atual', sql`${t.quantidadeAtual} >= 0`),
    check('ck_estoque_quantidade_minima', sql`${t.quantidadeMinima} >= 0`),
  ],
);

export const movimentacaoEstoque = pgTable(
  'movimentacao_estoque',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    produtoId: bigint('produto_id', { mode: 'number' })
      .notNull()
      .references(() => produto.id, { onDelete: 'cascade' }),
    agendamentoId: bigint('agendamento_id', { mode: 'number' }),
    usuarioId: bigint('usuario_id', { mode: 'number' }).references(() => usuario.id, {
      onDelete: 'set null',
    }),
    tipo: tipoMovimentacaoEnum('tipo').notNull(),
    origem: origemMovimentacaoEnum('origem').notNull(),
    quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
    valorFinanceiro: numeric('valor_financeiro', { precision: 12, scale: 2 }),
    motivo: varchar('motivo', { length: 500 }),
    ocorridoEm: timestamp('ocorrido_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ix_movimentacao_empresa_data').on(t.empresaId, t.ocorridoEm),
    index('ix_movimentacao_produto').on(t.produtoId, t.ocorridoEm),
    check('ck_movimentacao_quantidade', sql`${t.quantidade} > 0`),
    check(
      'ck_movimentacao_valor',
      sql`${t.valorFinanceiro} IS NULL OR ${t.valorFinanceiro} >= 0`,
    ),
  ],
);

export const produtoRelations = relations(produto, ({ one }) => ({
  categoria: one(categoriaProduto, {
    fields: [produto.categoriaProdutoId],
    references: [categoriaProduto.id],
  }),
  estoque: one(estoque, { fields: [produto.id], references: [estoque.produtoId] }),
}));

export const estoqueRelations = relations(estoque, ({ one }) => ({
  produto: one(produto, { fields: [estoque.produtoId], references: [produto.id] }),
}));

export const movimentacaoRelations = relations(movimentacaoEstoque, ({ one }) => ({
  produto: one(produto, { fields: [movimentacaoEstoque.produtoId], references: [produto.id] }),
  usuario: one(usuario, { fields: [movimentacaoEstoque.usuarioId], references: [usuario.id] }),
}));

export type CategoriaProduto = typeof categoriaProduto.$inferSelect;
export type Produto = typeof produto.$inferSelect;
export type Estoque = typeof estoque.$inferSelect;
export type MovimentacaoEstoque = typeof movimentacaoEstoque.$inferSelect;
