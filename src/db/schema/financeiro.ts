import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { agendamento } from './agendamento';
import { empresa } from './empresa';
import { categoriaDespesaEnum, tipoNotificacaoEnum } from './enums';

export const formaPagamento = pgTable(
  'forma_pagamento',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 50 }).notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('uq_forma_pagamento_empresa_nome').on(t.empresaId, t.nome)],
);

export const receita = pgTable(
  'receita',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    agendamentoId: bigint('agendamento_id', { mode: 'number' }).references(() => agendamento.id, {
      onDelete: 'cascade',
    }),
    formaPagamentoId: bigint('forma_pagamento_id', { mode: 'number' })
      .notNull()
      .references(() => formaPagamento.id),
    descricao: varchar('descricao', { length: 200 }).notNull(),
    valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
    dataRecebimento: date('data_recebimento').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_receita_agendamento')
      .on(t.agendamentoId)
      .where(sql`agendamento_id IS NOT NULL`),
    index('ix_receita_empresa_data').on(t.empresaId, t.dataRecebimento),
    check('ck_receita_valor', sql`${t.valor} > 0`),
  ],
);

export const despesa = pgTable(
  'despesa',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    descricao: varchar('descricao', { length: 200 }).notNull(),
    categoria: categoriaDespesaEnum('categoria').notNull(),
    valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
    dataPagamento: date('data_pagamento').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ix_despesa_empresa_data').on(t.empresaId, t.dataPagamento),
    check('ck_despesa_valor', sql`${t.valor} > 0`),
  ],
);

export const notificacao = pgTable(
  'notificacao',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** NULL = notificacao de plataforma, visivel apenas ao SUPER_ADMIN. */
    empresaId: bigint('empresa_id', { mode: 'number' }).references(() => empresa.id, {
      onDelete: 'cascade',
    }),
    tipo: tipoNotificacaoEnum('tipo').notNull(),
    titulo: varchar('titulo', { length: 150 }).notNull(),
    mensagem: varchar('mensagem', { length: 1000 }).notNull(),
    lida: boolean('lida').notNull().default(false),
    referenciaTipo: varchar('referencia_tipo', { length: 40 }),
    referenciaId: bigint('referencia_id', { mode: 'number' }),
    acaoUrl: varchar('acao_url', { length: 255 }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ix_notificacao_empresa_lida').on(t.empresaId, t.lida, t.criadoEm),
    index('ix_notificacao_referencia').on(t.empresaId, t.tipo, t.referenciaTipo, t.referenciaId),
  ],
);

export const receitaRelations = relations(receita, ({ one }) => ({
  formaPagamento: one(formaPagamento, {
    fields: [receita.formaPagamentoId],
    references: [formaPagamento.id],
  }),
  agendamento: one(agendamento, {
    fields: [receita.agendamentoId],
    references: [agendamento.id],
  }),
}));

export type FormaPagamento = typeof formaPagamento.$inferSelect;
export type Receita = typeof receita.$inferSelect;
export type Despesa = typeof despesa.$inferSelect;
export type Notificacao = typeof notificacao.$inferSelect;
