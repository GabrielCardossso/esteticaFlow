import { z } from 'zod';

/**
 * Schema de ambiente validado no boot. Qualquer variavel ausente ou invalida
 * derruba a aplicacao imediatamente, em vez de falhar no meio de um request.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL de conexao valida.'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET deve ter no minimo 32 caracteres.'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cache: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cache) return cache;

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variaveis de ambiente invalidas:\n${detalhes}`);
  }

  cache = parsed.data;
  return cache;
}
