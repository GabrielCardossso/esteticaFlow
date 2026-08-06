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
import { cliente, veiculo } from './cliente';
import { empresa } from './empresa';
import { statusAgendamentoEnum } from './enums';
import { servico } from './servico';
import { usuario } from './usuario';

export const agendamento = pgTable(
  'agendamento',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    clienteId: bigint('cliente_id', { mode: 'number' })
      .notNull()
      .references(() => cliente.id),
    veiculoId: bigint('veiculo_id', { mode: 'number' })
      .notNull()
      .references(() => veiculo.id),
    /** Profissional responsável pela execução; opcional. */
    responsavelId: bigint('responsavel_id', { mode: 'number' }).references(() => usuario.id, {
      onDelete: 'set null',
    }),
    dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
    /** Soma dos tempos estimados dos servicos, congelada na criacao. */
    duracaoMinutos: numeric('duracao_minutos', { precision: 10, scale: 0 }).notNull(),
    status: statusAgendamentoEnum('status').notNull().default('AGENDADO'),
    observacoes: varchar('observacoes', { length: 500 }),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    desconto: numeric('desconto', { precision: 10, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    pago: boolean('pago').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('ix_agendamento_empresa_data').on(t.empresaId, t.dataHora),
    index('ix_agendamento_empresa_status').on(t.empresaId, t.status),
    index('ix_agendamento_cliente').on(t.clienteId, t.status),
    check('ck_agendamento_subtotal', sql`${t.subtotal} > 0`),
    check('ck_agendamento_desconto', sql`${t.desconto} >= 0 AND ${t.desconto} < ${t.subtotal}`),
    check(
      'ck_agendamento_total',
      sql`${t.total} > 0 AND ${t.total} = ${t.subtotal} - ${t.desconto}`,
    ),
    check('ck_agendamento_duracao', sql`${t.duracaoMinutos} > 0`),
  ],
);

export const agendamentoServico = pgTable(
  'agendamento_servico',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    agendamentoId: bigint('agendamento_id', { mode: 'number' })
      .notNull()
      .references(() => agendamento.id, { onDelete: 'cascade' }),
    servicoId: bigint('servico_id', { mode: 'number' })
      .notNull()
      .references(() => servico.id),
    /** Preco congelado no momento da criacao do agendamento. */
    precoUnitario: numeric('preco_unitario', { precision: 10, scale: 2 }).notNull(),
    tempoEstimadoMinutos: numeric('tempo_estimado_minutos', { precision: 10, scale: 0 }).notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_agendamento_servico').on(t.agendamentoId, t.servicoId),
    index('ix_agendamento_servico_servico').on(t.servicoId),
    check('ck_agendamento_servico_preco', sql`${t.precoUnitario} > 0`),
  ],
);

export const agendamentoRelations = relations(agendamento, ({ one, many }) => ({
  cliente: one(cliente, { fields: [agendamento.clienteId], references: [cliente.id] }),
  veiculo: one(veiculo, { fields: [agendamento.veiculoId], references: [veiculo.id] }),
  responsavel: one(usuario, {
    fields: [agendamento.responsavelId],
    references: [usuario.id],
  }),
  servicos: many(agendamentoServico),
}));

export const agendamentoServicoRelations = relations(agendamentoServico, ({ one }) => ({
  agendamento: one(agendamento, {
    fields: [agendamentoServico.agendamentoId],
    references: [agendamento.id],
  }),
  servico: one(servico, { fields: [agendamentoServico.servicoId], references: [servico.id] }),
}));

export type Agendamento = typeof agendamento.$inferSelect;
export type NovoAgendamento = typeof agendamento.$inferInsert;
export type AgendamentoServico = typeof agendamentoServico.$inferSelect;
