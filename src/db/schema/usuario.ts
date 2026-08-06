import { relations } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { empresa } from './empresa';
import { papelUsuarioEnum } from './enums';

export const usuario = pgTable(
  'usuario',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }).notNull(),
    senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
    papel: papelUsuarioEnum('papel').notNull().default('FUNCIONARIO'),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_usuario_email').on(t.email),
    index('ix_usuario_empresa').on(t.empresaId),
  ],
);

export const historicoAcesso = pgTable(
  'historico_acesso',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    usuarioId: bigint('usuario_id', { mode: 'number' })
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    ocorridoEm: timestamp('ocorrido_em', { withTimezone: true }).notNull().defaultNow(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 500 }),
    navegador: varchar('navegador', { length: 80 }),
    sistemaOperacional: varchar('sistema_operacional', { length: 80 }),
  },
  (t) => [
    index('ix_historico_acesso_empresa').on(t.empresaId, t.ocorridoEm),
    index('ix_historico_acesso_usuario').on(t.usuarioId, t.ocorridoEm),
  ],
);

export const log = pgTable(
  'log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    usuarioId: bigint('usuario_id', { mode: 'number' }).references(() => usuario.id, {
      onDelete: 'set null',
    }),
    acao: varchar('acao', { length: 100 }).notNull(),
    detalhes: varchar('detalhes', { length: 2000 }),
    ocorridoEm: timestamp('ocorrido_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ix_log_empresa_data').on(t.empresaId, t.ocorridoEm)],
);

export const usuarioRelations = relations(usuario, ({ one }) => ({
  empresa: one(empresa, { fields: [usuario.empresaId], references: [empresa.id] }),
}));

export const logRelations = relations(log, ({ one }) => ({
  usuario: one(usuario, { fields: [log.usuarioId], references: [usuario.id] }),
  empresa: one(empresa, { fields: [log.empresaId], references: [empresa.id] }),
}));

export type Usuario = typeof usuario.$inferSelect;
export type NovoUsuario = typeof usuario.$inferInsert;
export type HistoricoAcesso = typeof historicoAcesso.$inferSelect;
export type Log = typeof log.$inferSelect;
