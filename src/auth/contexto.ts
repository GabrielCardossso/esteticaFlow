import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { empresa as tabelaEmpresa } from '@/db/schema';
import {
  motivoDoBloqueio,
  permiteRecurso,
  podeAcessar,
  recalcularStatus,
  recursosDisponiveis,
  type Papel,
  type Plano,
  type Recurso,
  type StatusAssinatura,
} from '@/domain/plano';
import { falha, naoAutorizado, ok, erro, type Result } from '@/domain/result';
import { hojeISO } from '@/domain/shared/tempo';
import { COOKIE_SESSAO, enriquecer, lerSessao, type UsuarioDaSessao } from './sessao';

export interface EmpresaDoContexto {
  readonly id: number;
  readonly nomeFantasia: string;
  readonly razaoSocial: string;
  readonly cnpj: string;
  readonly telefone: string | null;
  readonly email: string | null;
  readonly ativo: boolean;
  readonly plano: Plano;
  readonly statusAssinatura: StatusAssinatura;
  readonly valorMensalidade: string;
  readonly proximoVencimento: string;
  readonly motivoBloqueio: string | null;
}

export interface Contexto {
  readonly usuario: UsuarioDaSessao;
  readonly empresa: EmpresaDoContexto;
  readonly papel: Papel;
  readonly empresaId: number;
  readonly recursos: readonly Recurso[];
  permite(recurso: Recurso): boolean;
}

/**
 * Le a sessao do cookie, recarrega a empresa e recalcula a situacao da
 * assinatura. Feito a cada requisicao: um bloqueio aplicado pela plataforma
 * derruba o acesso na proxima acao do usuario, sem esperar expirar o cookie.
 */
export async function carregarContexto(): Promise<Result<Contexto>> {
  const jar = await cookies();
  const conteudo = await lerSessao(jar.get(COOKIE_SESSAO)?.value);

  if (conteudo === null) {
    return falha(erro('NAO_AUTENTICADO', 'Sessão expirada. Entre novamente.'));
  }

  const [registro] = await db
    .select()
    .from(tabelaEmpresa)
    .where(eq(tabelaEmpresa.id, conteudo.empresaId))
    .limit(1);

  if (registro === undefined) {
    return falha(erro('NAO_AUTENTICADO', 'Empresa da sessão não encontrada.'));
  }

  const statusAtual = recalcularStatus(
    {
      ativo: registro.ativo,
      status: registro.statusAssinatura,
      proximoVencimento: registro.proximoVencimento,
    },
    hojeISO(),
  );

  if (statusAtual !== registro.statusAssinatura) {
    await db
      .update(tabelaEmpresa)
      .set({ statusAssinatura: statusAtual })
      .where(eq(tabelaEmpresa.id, registro.id));
  }

  const situacao = {
    ativo: registro.ativo,
    status: statusAtual,
    proximoVencimento: registro.proximoVencimento,
  };

  const usuario = enriquecer(conteudo);

  if (!usuario.ehSuperAdmin && !podeAcessar(situacao)) {
    return falha(
      erro(
        'NAO_AUTORIZADO',
        motivoDoBloqueio(situacao) ?? 'Acesso indisponível para esta empresa.',
      ),
    );
  }

  const empresa: EmpresaDoContexto = {
    id: registro.id,
    nomeFantasia: registro.nomeFantasia,
    razaoSocial: registro.razaoSocial,
    cnpj: registro.cnpj,
    telefone: registro.telefone,
    email: registro.email,
    ativo: registro.ativo,
    plano: registro.plano,
    statusAssinatura: statusAtual,
    valorMensalidade: registro.valorMensalidade,
    proximoVencimento: registro.proximoVencimento,
    motivoBloqueio: registro.motivoBloqueio,
  };

  return ok({
    usuario,
    empresa,
    papel: usuario.papel,
    empresaId: empresa.id,
    recursos: recursosDisponiveis(empresa.plano, usuario.papel),
    permite: (recurso: Recurso) => permiteRecurso(empresa.plano, usuario.papel, recurso),
  });
}

export function exigirRecurso(contexto: Contexto, recurso: Recurso): Result<true> {
  if (contexto.permite(recurso)) return ok(true);
  return falha(
    erro('RECURSO_DO_PLANO', 'Este recurso está disponível no plano Pro.', {
      detalhes: { recurso },
    }),
  );
}

export function exigirAdministrador(contexto: Contexto): Result<true> {
  if (contexto.usuario.ehAdministrador) return ok(true);
  return falha(naoAutorizado('Apenas administradores podem executar esta ação.'));
}

export function exigirAdministradorDaEmpresa(contexto: Contexto): Result<true> {
  if (contexto.papel === 'ADMINISTRADOR') return ok(true);
  return falha(
    naoAutorizado('Apenas o administrador da empresa pode gerenciar usuários.'),
  );
}

export function exigirSuperAdmin(contexto: Contexto): Result<true> {
  if (contexto.usuario.ehSuperAdmin) return ok(true);
  return falha(naoAutorizado('Ação restrita ao administrador da plataforma.'));
}
