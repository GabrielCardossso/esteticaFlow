import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

/**
 * Conexao unica por instancia. Em ambiente serverless o modulo e reaproveitado
 * entre invocacoes quentes, entao o pool fica pequeno e `prepare` desligado
 * para funcionar com poolers em modo transaction (PgBouncer/Supabase).
 */
const globalForDb = globalThis as unknown as {
  __esteticaflowSql?: ReturnType<typeof postgres>;
};

function criarConexao() {
  return postgres(env().DATABASE_URL, {
    max: env().NODE_ENV === 'production' ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
}

const sql = globalForDb.__esteticaflowSql ?? criarConexao();
if (env().NODE_ENV !== 'production') {
  globalForDb.__esteticaflowSql = sql;
}

export const db = drizzle(sql, { schema, casing: 'snake_case' });
export const conexao = sql;
export type Db = typeof db;
export type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];
