import { db, type Transacao } from '@/db/client';
import { log } from '@/db/schema';
import { truncar } from '@/domain/shared/texto';

import type { AcaoRegistrada } from '@/domain/auditoria';

export type { AcaoRegistrada };

export interface EntradaDeLog {
  readonly empresaId: number;
  readonly usuarioId: number | null;
  readonly acao: AcaoRegistrada;
  readonly detalhes?: string | null;
}

/**
 * Trilha de auditoria. Nunca deve derrubar a operacao principal: uma falha
 * ao registrar log e reportada no console, mas a transacao de negocio segue.
 */
export async function registrar(entrada: EntradaDeLog, tx?: Transacao): Promise<void> {
  const executor = tx ?? db;
  try {
    await executor.insert(log).values({
      empresaId: entrada.empresaId,
      usuarioId: entrada.usuarioId,
      acao: entrada.acao,
      detalhes: entrada.detalhes ? truncar(entrada.detalhes, 2000) : null,
    });
  } catch (excecao) {
    console.error('[esteticaflow] falha ao registrar log:', excecao);
  }
}
