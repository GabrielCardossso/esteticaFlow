import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { empresa } from './empresa';

export const categoriaServico = pgTable(
  'categoria_servico',
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
  (t) => [uniqueIndex('uq_categoria_servico_empresa_nome').on(t.empresaId, t.nome)],
);

export const servico = pgTable(
  'servico',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    categoriaServicoId: bigint('categoria_servico_id', { mode: 'number' })
      .notNull()
      .references(() => categoriaServico.id),
    nome: varchar('nome', { length: 150 }).notNull(),
    descricao: varchar('descricao', { length: 500 }),
    preco: numeric('preco', { precision: 10, scale: 2 }).notNull(),
    tempoEstimadoMinutos: integer('tempo_estimado_minutos').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('ix_servico_empresa_ativo_nome').on(t.empresaId, t.ativo, t.nome),
    check('ck_servico_preco', sql`${t.preco} > 0`),
    check('ck_servico_tempo', sql`${t.tempoEstimadoMinutos} > 0`),
  ],
);

export const categoriaServicoRelations = relations(categoriaServico, ({ many }) => ({
  servicos: many(servico),
}));

export const servicoRelations = relations(servico, ({ one }) => ({
  categoria: one(categoriaServico, {
    fields: [servico.categoriaServicoId],
    references: [categoriaServico.id],
  }),
}));

export type CategoriaServico = typeof categoriaServico.$inferSelect;
export type Servico = typeof servico.$inferSelect;
export type NovoServico = typeof servico.$inferInsert;
