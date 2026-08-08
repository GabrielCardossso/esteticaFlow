import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { planoAssinaturaEnum, statusAssinaturaEnum, statusSolicitacaoEnum } from './enums';
import { usuario } from './usuario';

export const empresa = pgTable(
  'empresa',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    razaoSocial: varchar('razao_social', { length: 150 }).notNull(),
    nomeFantasia: varchar('nome_fantasia', { length: 150 }).notNull(),
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    telefone: varchar('telefone', { length: 11 }),
    email: varchar('email', { length: 150 }),
    ativo: boolean('ativo').notNull().default(true),
    plano: planoAssinaturaEnum('plano').notNull().default('BASICO'),
    statusAssinatura: statusAssinaturaEnum('status_assinatura').notNull().default('ATIVA'),
    valorMensalidade: numeric('valor_mensalidade', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    proximoVencimento: date('proximo_vencimento').notNull(),
    bloqueioManual: boolean('bloqueio_manual').notNull().default(false),
    motivoBloqueio: varchar('motivo_bloqueio', { length: 500 }),
    bloqueadoEm: timestamp('bloqueado_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_empresa_cnpj').on(t.cnpj),
    index('ix_empresa_status_assinatura').on(t.statusAssinatura),
    index('ix_empresa_proximo_vencimento').on(t.proximoVencimento),
    check('ck_empresa_valor_mensalidade', sql`${t.valorMensalidade} >= 0`),
    check('ck_empresa_cnpj_digitos', sql`${t.cnpj} ~ '^[0-9]{14}$'`),
  ],
);

export const configuracao = pgTable(
  'configuracao',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    chave: varchar('chave', { length: 100 }).notNull(),
    valor: varchar('valor', { length: 255 }).notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('uq_configuracao_empresa_chave').on(t.empresaId, t.chave)],
);

/** Contadores técnicos, inacessíveis pela Data API, usados para proteção contra abuso. */
export const controleRateLimit = pgTable(
  'controle_rate_limit',
  {
    chave: varchar('chave', { length: 200 }).primaryKey(),
    janelaInicio: timestamp('janela_inicio', { withTimezone: true }).notNull(),
    contagem: integer('contagem').notNull().default(0),
    bloqueadoAte: timestamp('bloqueado_ate', { withTimezone: true }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ix_controle_rate_limit_atualizado').on(t.atualizadoEm),
    check('ck_controle_rate_limit_contagem', sql`${t.contagem} >= 0`),
  ],
);

export const solicitacaoAlteracaoEmpresa = pgTable(
  'solicitacao_alteracao_empresa',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    razaoSocial: varchar('razao_social', { length: 150 }).notNull(),
    nomeFantasia: varchar('nome_fantasia', { length: 150 }).notNull(),
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    telefone: varchar('telefone', { length: 11 }),
    email: varchar('email', { length: 150 }),
    status: statusSolicitacaoEnum('status').notNull().default('PENDENTE'),
    solicitadoPor: bigint('solicitado_por', { mode: 'number' })
      .notNull()
      .references(() => usuario.id),
    decididoPor: bigint('decidido_por', { mode: 'number' }).references(() => usuario.id),
    motivo: varchar('motivo', { length: 500 }),
    decididoEm: timestamp('decidido_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('ix_solicitacao_empresa_status').on(t.empresaId, t.status),
    uniqueIndex('uq_solicitacao_pendente_empresa')
      .on(t.empresaId)
      .where(sql`status = 'PENDENTE'`),
  ],
);

export const empresaRelations = relations(empresa, ({ many }) => ({
  usuarios: many(usuario),
  configuracoes: many(configuracao),
}));

export const configuracaoRelations = relations(configuracao, ({ one }) => ({
  empresa: one(empresa, { fields: [configuracao.empresaId], references: [empresa.id] }),
}));

export const solicitacaoRelations = relations(solicitacaoAlteracaoEmpresa, ({ one }) => ({
  empresa: one(empresa, {
    fields: [solicitacaoAlteracaoEmpresa.empresaId],
    references: [empresa.id],
  }),
}));

export type Empresa = typeof empresa.$inferSelect;
export type NovaEmpresa = typeof empresa.$inferInsert;
export type Configuracao = typeof configuracao.$inferSelect;
export type SolicitacaoAlteracaoEmpresa = typeof solicitacaoAlteracaoEmpresa.$inferSelect;
export type ControleRateLimit = typeof controleRateLimit.$inferSelect;
