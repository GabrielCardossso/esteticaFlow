import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { empresa } from './empresa';

export const cliente = pgTable(
  'cliente',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 150 }).notNull(),
    cpfCnpj: varchar('cpf_cnpj', { length: 14 }),
    telefone: varchar('telefone', { length: 11 }).notNull(),
    email: varchar('email', { length: 150 }),
    cep: varchar('cep', { length: 8 }),
    logradouro: varchar('logradouro', { length: 150 }),
    numero: varchar('numero', { length: 20 }),
    complemento: varchar('complemento', { length: 100 }),
    bairro: varchar('bairro', { length: 100 }),
    cidade: varchar('cidade', { length: 100 }),
    uf: varchar('uf', { length: 2 }),
    observacoes: varchar('observacoes', { length: 500 }),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_cliente_documento_empresa')
      .on(t.empresaId, t.cpfCnpj)
      .where(sql`cpf_cnpj IS NOT NULL`),
    index('ix_cliente_empresa_nome').on(t.empresaId, t.nome),
    index('ix_cliente_empresa_ativo').on(t.empresaId, t.ativo),
    check('ck_cliente_telefone', sql`${t.telefone} ~ '^[0-9]{10,11}$'`),
    check('ck_cliente_cep', sql`${t.cep} IS NULL OR ${t.cep} ~ '^[0-9]{8}$'`),
    check(
      'ck_cliente_documento',
      sql`${t.cpfCnpj} IS NULL OR ${t.cpfCnpj} ~ '^([0-9]{11}|[0-9]{14})$'`,
    ),
  ],
);

export const veiculo = pgTable(
  'veiculo',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    empresaId: bigint('empresa_id', { mode: 'number' })
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    clienteId: bigint('cliente_id', { mode: 'number' })
      .notNull()
      .references(() => cliente.id, { onDelete: 'cascade' }),
    placa: varchar('placa', { length: 7 }).notNull(),
    marca: varchar('marca', { length: 60 }).notNull(),
    modelo: varchar('modelo', { length: 100 }).notNull(),
    cor: varchar('cor', { length: 30 }),
    ano: integer('ano'),
    observacoes: varchar('observacoes', { length: 500 }),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uq_veiculo_placa_empresa').on(t.empresaId, t.placa),
    index('ix_veiculo_cliente').on(t.clienteId),
    check('ck_veiculo_ano', sql`${t.ano} IS NULL OR (${t.ano} >= 1950 AND ${t.ano} <= 2100)`),
    check('ck_veiculo_placa', sql`${t.placa} ~ '^[A-Z]{3}([0-9]{4}|[0-9][A-Z][0-9]{2})$'`),
  ],
);

export const clienteRelations = relations(cliente, ({ one, many }) => ({
  empresa: one(empresa, { fields: [cliente.empresaId], references: [empresa.id] }),
  veiculos: many(veiculo),
}));

export const veiculoRelations = relations(veiculo, ({ one }) => ({
  cliente: one(cliente, { fields: [veiculo.clienteId], references: [cliente.id] }),
  empresa: one(empresa, { fields: [veiculo.empresaId], references: [empresa.id] }),
}));

export type Cliente = typeof cliente.$inferSelect;
export type NovoCliente = typeof cliente.$inferInsert;
export type Veiculo = typeof veiculo.$inferSelect;
export type NovoVeiculo = typeof veiculo.$inferInsert;
