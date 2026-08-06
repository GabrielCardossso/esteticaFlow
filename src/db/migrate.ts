import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Aplica as migrations pendentes. Roda com `npm run db:migrate`, tanto em
 * desenvolvimento quanto no passo de deploy.
 */
async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (typeof url !== 'string' || url === '') {
    throw new Error('DATABASE_URL não configurada.');
  }

  const conexao = postgres(url, { max: 1, prepare: false });
  const banco = drizzle(conexao);

  console.warn('› Aplicando migrations...');
  await migrate(banco, { migrationsFolder: './drizzle' });
  console.warn('✓ Banco atualizado.');

  await conexao.end();
}

principal().catch((excecao: unknown) => {
  console.error('✗ Falha ao migrar:', excecao);
  process.exit(1);
});
