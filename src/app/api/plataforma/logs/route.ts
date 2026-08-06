import { desc, eq } from 'drizzle-orm';
import { exigirSuperAdmin } from '@/auth/contexto';
import { db } from '@/db/client';
import { empresa, log, usuario } from '@/db/schema';
import { ok } from '@/domain/result';
import { comContexto } from '@/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const bruto = new URL(request.url).searchParams.get('empresaId');
  const empresaId = bruto === null ? null : Number.parseInt(bruto, 10);
  const filtrar = empresaId !== null && Number.isInteger(empresaId) && empresaId > 0;

  return comContexto(async (contexto) => {
    const permissao = exigirSuperAdmin(contexto);
    if (!permissao.ok) return permissao;

    const registros = await db
      .select({
        id: log.id,
        acao: log.acao,
        detalhes: log.detalhes,
        ocorridoEm: log.ocorridoEm,
        usuarioNome: usuario.nome,
        empresaNome: empresa.nomeFantasia,
      })
      .from(log)
      .leftJoin(usuario, eq(usuario.id, log.usuarioId))
      .innerJoin(empresa, eq(empresa.id, log.empresaId))
      .where(filtrar ? eq(log.empresaId, empresaId) : undefined)
      .orderBy(desc(log.ocorridoEm))
      .limit(200);

    return ok(registros.map((r) => ({ ...r, ocorridoEm: new Date(r.ocorridoEm).toISOString() })));
  });
}
