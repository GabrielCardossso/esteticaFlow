import { eq } from 'drizzle-orm';
import { conferirSenha } from '@/auth/senha';
import type { ConteudoSessao } from '@/auth/sessao';
import { db } from '@/db/client';
import { empresa, historicoAcesso, usuario } from '@/db/schema';
import { motivoDoBloqueio, podeAcessar, recalcularStatus } from '@/domain/plano';
import { erro, falha, ok, type Result } from '@/domain/result';
import { hojeISO } from '@/domain/shared/tempo';
import type { LoginPayload } from '@/schemas';
import { registrar } from './log';

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos.';

/**
 * Autenticacao por credenciais. A mensagem de erro e sempre a mesma para
 * e-mail inexistente e senha errada, para nao revelar quais contas existem.
 */
export async function autenticar(dados: LoginPayload): Promise<Result<ConteudoSessao>> {
  const [conta] = await db
    .select({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senhaHash: usuario.senhaHash,
      papel: usuario.papel,
      ativo: usuario.ativo,
      empresaId: usuario.empresaId,
    })
    .from(usuario)
    .where(eq(usuario.email, dados.email))
    .limit(1);

  if (conta === undefined) {
    return falha(erro('NAO_AUTENTICADO', CREDENCIAIS_INVALIDAS, { campo: 'email' }));
  }

  const senhaConfere = await conferirSenha(dados.senha, conta.senhaHash);
  if (!senhaConfere) {
    return falha(erro('NAO_AUTENTICADO', CREDENCIAIS_INVALIDAS, { campo: 'senha' }));
  }

  if (!conta.ativo) {
    return falha(
      erro('NAO_AUTORIZADO', 'Este usuário está arquivado. Fale com o administrador da empresa.'),
    );
  }

  const [organizacao] = await db
    .select()
    .from(empresa)
    .where(eq(empresa.id, conta.empresaId))
    .limit(1);

  if (organizacao === undefined) {
    return falha(erro('NAO_AUTORIZADO', 'Empresa não encontrada.'));
  }

  const status = recalcularStatus(
    {
      ativo: organizacao.ativo,
      status: organizacao.statusAssinatura,
      proximoVencimento: organizacao.proximoVencimento,
    },
    hojeISO(),
  );

  if (status !== organizacao.statusAssinatura) {
    await db.update(empresa).set({ statusAssinatura: status }).where(eq(empresa.id, organizacao.id));
  }

  const situacao = {
    ativo: organizacao.ativo,
    status,
    proximoVencimento: organizacao.proximoVencimento,
  };

  if (conta.papel !== 'SUPER_ADMIN' && !podeAcessar(situacao)) {
    return falha(
      erro('NAO_AUTORIZADO', motivoDoBloqueio(situacao) ?? 'Acesso indisponível para esta empresa.'),
    );
  }

  return ok({
    usuarioId: conta.id,
    empresaId: conta.empresaId,
    papel: conta.papel,
    nome: conta.nome,
    email: conta.email,
  });
}

function detectarNavegador(userAgent: string | null): string {
  if (userAgent === null) return 'Desconhecido';
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Firefox/')) return 'Mozilla Firefox';
  if (userAgent.includes('Chrome/')) return 'Google Chrome';
  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Outro';
}

function detectarSistema(userAgent: string | null): string {
  if (userAgent === null) return 'Desconhecido';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) return 'macOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Outro';
}

export async function registrarAcesso(
  sessao: ConteudoSessao,
  cabecalhos: Headers,
): Promise<void> {
  const userAgent = cabecalhos.get('user-agent');
  const encaminhado = cabecalhos.get('x-forwarded-for');
  const ip = encaminhado?.split(',')[0]?.trim() ?? cabecalhos.get('x-real-ip') ?? null;

  try {
    await db.insert(historicoAcesso).values({
      empresaId: sessao.empresaId,
      usuarioId: sessao.usuarioId,
      ip,
      userAgent: userAgent === null ? null : userAgent.slice(0, 500),
      navegador: detectarNavegador(userAgent),
      sistemaOperacional: detectarSistema(userAgent),
    });
  } catch (excecao) {
    console.error('[esteticaflow] falha ao registrar acesso:', excecao);
  }

  await registrar({
    empresaId: sessao.empresaId,
    usuarioId: sessao.usuarioId,
    acao: 'LOGIN_REALIZADO',
  });
}
