import { and, count, desc, eq, isNull, ne } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { exigirSuperAdmin } from '@/auth/contexto';
import { gerarHash } from '@/auth/senha';
import {
  CATALOGO_PLANOS,
  diasEmAtraso,
  elegivelParaBloqueio,
  recalcularStatus,
  type Plano,
  type StatusAssinatura,
} from '@/domain/plano';
import { db } from '@/db/client';
import {
  categoriaProduto,
  categoriaServico,
  configuracao,
  empresa,
  formaPagamento,
  notificacao,
  solicitacaoAlteracaoEmpresa,
  usuario,
} from '@/db/schema';
import { conflito, falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { adicionarMeses, hojeISO, m, paraISO } from '@/domain/shared/tempo';
import { contemTermo } from '@/domain/shared/texto';
import { CHAVE_SESSAO_ATIVA, CHAVE_SESSAO_MINUTOS, CHAVE_TEMA_COR, CHAVE_TEMA_HEX, CHAVE_TEMA_MODO, ACENTO_PADRAO, HEX_PADRAO } from '@/domain/tema';
import type {
  AssinaturaPayload,
  BloqueioInput,
  FiltroEmpresas,
  NovaEmpresaPayload,
} from '@/schemas';
import { descreverPedido } from './configuracoes';
import { registrar } from './log';
import { notificarEmpresa, notificarPlataforma } from './notificacoes';

export interface EmpresaDaLista {
  id: number;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  plano: Plano;
  statusAssinatura: StatusAssinatura;
  valorMensalidade: string;
  proximoVencimento: string;
  motivoBloqueio: string | null;
  diasEmAtraso: number;
  elegivelBloqueio: boolean;
  totalUsuarios: number;
}

export async function listarEmpresas(
  contexto: Contexto,
  filtro: FiltroEmpresas,
): Promise<Result<EmpresaDaLista[]>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const condicoes = [];
  if (filtro.situacao === 'ativas') condicoes.push(eq(empresa.ativo, true));
  if (filtro.situacao === 'inativas') condicoes.push(eq(empresa.ativo, false));
  if (filtro.plano !== undefined) condicoes.push(eq(empresa.plano, filtro.plano));

  const registros = await db
    .select()
    .from(empresa)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(empresa.nomeFantasia);

  const contagens = await db
    .select({ empresaId: usuario.empresaId, total: count() })
    .from(usuario)
    .where(eq(usuario.ativo, true))
    .groupBy(usuario.empresaId);

  const mapaUsuarios = new Map(contagens.map((c) => [c.empresaId, Number(c.total)]));
  const hoje = hojeISO();

  const lista = registros
    .map((registro) => {
      const status = recalcularStatus(
        {
          ativo: registro.ativo,
          status: registro.statusAssinatura,
          proximoVencimento: registro.proximoVencimento,
        },
        hoje,
      );
      return {
        id: registro.id,
        razaoSocial: registro.razaoSocial,
        nomeFantasia: registro.nomeFantasia,
        cnpj: registro.cnpj,
        telefone: registro.telefone,
        email: registro.email,
        ativo: registro.ativo,
        plano: registro.plano,
        statusAssinatura: status,
        valorMensalidade: registro.valorMensalidade,
        proximoVencimento: registro.proximoVencimento,
        motivoBloqueio: registro.motivoBloqueio,
        diasEmAtraso: diasEmAtraso(registro.proximoVencimento, hoje),
        elegivelBloqueio: elegivelParaBloqueio(registro.proximoVencimento, hoje),
        totalUsuarios: mapaUsuarios.get(registro.id) ?? 0,
      } satisfies EmpresaDaLista;
    })
    .filter((item) => {
      if (filtro.busca === '') return true;
      const digitos = filtro.busca.replace(/\D/g, '');
      return (
        contemTermo(item.nomeFantasia, filtro.busca) ||
        contemTermo(item.razaoSocial, filtro.busca) ||
        (digitos !== '' && item.cnpj.includes(digitos))
      );
    });

  return ok(lista);
}

/** Cria a empresa, o administrador inicial e os catalogos minimos de operacao. */
export async function criarEmpresa(
  contexto: Contexto,
  dados: NovaEmpresaPayload,
): Promise<Result<{ id: number }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [cnpjEmUso] = await db
    .select({ id: empresa.id })
    .from(empresa)
    .where(eq(empresa.cnpj, dados.cnpj))
    .limit(1);
  if (cnpjEmUso !== undefined) return falha(conflito('Este CNPJ já está cadastrado.', 'cnpj'));

  const [emailEmUso] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.email, dados.adminEmail))
    .limit(1);
  if (emailEmUso !== undefined) {
    return falha(conflito('Este e-mail de administrador já está em uso.', 'adminEmail'));
  }

  const senhaHash = await gerarHash(dados.adminSenha);
  const mensalidade = dados.valorMensalidade ?? CATALOGO_PLANOS[dados.plano].valorMensalPadrao;

  const criada = await db.transaction(async (tx) => {
    const [nova] = await tx
      .insert(empresa)
      .values({
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia,
        cnpj: dados.cnpj,
        telefone: dados.telefone,
        email: dados.email,
        plano: dados.plano,
        valorMensalidade: mensalidade,
        proximoVencimento: dados.proximoVencimento,
      })
      .returning({ id: empresa.id });

    if (nova === undefined) throw new Error('Falha ao inserir empresa.');

    await tx.insert(usuario).values({
      empresaId: nova.id,
      nome: dados.adminNome,
      email: dados.adminEmail,
      senhaHash,
      papel: 'ADMINISTRADOR',
    });

    await tx.insert(configuracao).values([
      { empresaId: nova.id, chave: CHAVE_TEMA_COR, valor: ACENTO_PADRAO },
      { empresaId: nova.id, chave: CHAVE_TEMA_HEX, valor: HEX_PADRAO },
      { empresaId: nova.id, chave: CHAVE_TEMA_MODO, valor: 'escuro' },
      { empresaId: nova.id, chave: CHAVE_SESSAO_ATIVA, valor: 'false' },
      { empresaId: nova.id, chave: CHAVE_SESSAO_MINUTOS, valor: '30' },
    ]);

    await tx.insert(formaPagamento).values(
      ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito'].map((nome) => ({
        empresaId: nova.id,
        nome,
      })),
    );

    await tx.insert(categoriaServico).values(
      ['Lavagem', 'Polimento', 'Vitrificação', 'Higienização', 'Estética interna'].map((nome) => ({
        empresaId: nova.id,
        nome,
      })),
    );

    await tx.insert(categoriaProduto).values(
      ['Shampoo e detergentes', 'Ceras e selantes', 'Panos e acessórios', 'Químicos gerais'].map(
        (nome) => ({ empresaId: nova.id, nome }),
      ),
    );

    return nova;
  });

  await registrar({
    empresaId: criada.id,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'EMPRESA_CRIADA',
    detalhes: `${dados.nomeFantasia} — plano ${dados.plano}`,
  });

  return ok({ id: criada.id });
}

export async function atualizarAssinatura(
  contexto: Contexto,
  id: number,
  dados: AssinaturaPayload,
): Promise<Result<{ id: number; status: StatusAssinatura }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [alvo] = await db.select().from(empresa).where(eq(empresa.id, id)).limit(1);
  if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));

  const status = recalcularStatus(
    { ativo: alvo.ativo, status: alvo.statusAssinatura, proximoVencimento: dados.proximoVencimento },
    hojeISO(),
  );

  await db
    .update(empresa)
    .set({
      plano: dados.plano,
      valorMensalidade: dados.valorMensalidade,
      proximoVencimento: dados.proximoVencimento,
      statusAssinatura: status,
    })
    .where(eq(empresa.id, id));

  await registrar({
    empresaId: id,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'ASSINATURA_ATUALIZADA',
    detalhes: `Plano ${dados.plano}, vencimento ${dados.proximoVencimento}`,
  });

  return ok({ id, status });
}

/** Registra o pagamento: soma um mes a partir do vencimento ou de hoje. */
export async function registrarPagamentoAssinatura(
  contexto: Contexto,
  id: number,
): Promise<Result<{ id: number; proximoVencimento: string }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [alvo] = await db.select().from(empresa).where(eq(empresa.id, id)).limit(1);
  if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));

  const hoje = hojeISO();
  const base = m(alvo.proximoVencimento).isAfter(m(hoje)) ? alvo.proximoVencimento : hoje;
  const novoVencimento = paraISO(adicionarMeses(base, 1));

  const novoStatus: StatusAssinatura =
    alvo.statusAssinatura === 'BLOQUEADA' || alvo.statusAssinatura === 'CANCELADA'
      ? alvo.statusAssinatura
      : 'ATIVA';

  await db
    .update(empresa)
    .set({ proximoVencimento: novoVencimento, statusAssinatura: novoStatus })
    .where(eq(empresa.id, id));

  await registrar({
    empresaId: id,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'PAGAMENTO_ASSINATURA',
    detalhes: `Novo vencimento ${novoVencimento}`,
  });

  await notificarEmpresa({
    empresaId: id,
    tipo: 'ASSINATURA',
    titulo: 'Pagamento registrado',
    mensagem: `Recebemos o pagamento da assinatura. Próximo vencimento em ${novoVencimento}.`,
    referenciaTipo: 'EMPRESA',
    referenciaId: id,
    acaoUrl: '/painel/configuracoes',
    novaSempre: true,
  });

  return ok({ id, proximoVencimento: novoVencimento });
}

export async function bloquearEmpresa(
  contexto: Contexto,
  id: number,
  dados: BloqueioInput,
): Promise<Result<{ id: number }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [alvo] = await db.select().from(empresa).where(eq(empresa.id, id)).limit(1);
  if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));

  const manual = dados.manual ?? false;
  if (!manual && !elegivelParaBloqueio(alvo.proximoVencimento, hojeISO())) {
    return falha(
      conflito('A empresa ainda está dentro da tolerância de 7 dias. Use o bloqueio manual.'),
    );
  }

  await db
    .update(empresa)
    .set({
      statusAssinatura: 'BLOQUEADA',
      bloqueioManual: manual,
      motivoBloqueio: dados.motivo,
      bloqueadoEm: new Date(),
    })
    .where(eq(empresa.id, id));

  await registrar({
    empresaId: id,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'EMPRESA_BLOQUEADA',
    detalhes: dados.motivo,
  });

  return ok({ id });
}

export async function desbloquearEmpresa(
  contexto: Contexto,
  id: number,
): Promise<Result<{ id: number; status: StatusAssinatura }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [alvo] = await db.select().from(empresa).where(eq(empresa.id, id)).limit(1);
  if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));
  if (!alvo.ativo || alvo.statusAssinatura === 'CANCELADA') {
    return falha(conflito('Reative a empresa antes de desbloquear a assinatura.'));
  }

  const status = recalcularStatus(
    { ativo: true, status: 'ATIVA', proximoVencimento: alvo.proximoVencimento },
    hojeISO(),
  );

  await db
    .update(empresa)
    .set({
      statusAssinatura: status,
      bloqueioManual: false,
      motivoBloqueio: null,
      bloqueadoEm: null,
    })
    .where(eq(empresa.id, id));

  await registrar({
    empresaId: id,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'EMPRESA_DESBLOQUEADA',
  });

  return ok({ id, status });
}

export async function alternarEmpresaAtiva(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [alvo] = await db.select().from(empresa).where(eq(empresa.id, id)).limit(1);
  if (alvo === undefined) return falha(naoEncontrado('Empresa não encontrada.'));
  if (id === contexto.empresaId) {
    return falha(conflito('Não é possível arquivar a empresa da própria sessão.'));
  }

  const status: StatusAssinatura = ativo
    ? recalcularStatus(
        { ativo: true, status: 'ATIVA', proximoVencimento: alvo.proximoVencimento },
        hojeISO(),
      )
    : 'CANCELADA';

  await db
    .update(empresa)
    .set({
      ativo,
      statusAssinatura: status,
      bloqueioManual: false,
      motivoBloqueio: ativo ? null : alvo.motivoBloqueio,
      bloqueadoEm: ativo ? null : alvo.bloqueadoEm,
    })
    .where(eq(empresa.id, id));

  await registrar({
    empresaId: id,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'EMPRESA_REATIVADA' : 'EMPRESA_ARQUIVADA',
  });

  return ok({ id, ativo });
}

// ---------------------------------------------------------------------------
// Solicitacoes de alteracao cadastral
// ---------------------------------------------------------------------------

export async function listarSolicitacoesPendentes(contexto: Contexto) {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const registros = await db
    .select({
      solicitacao: solicitacaoAlteracaoEmpresa,
      empresaNome: empresa.nomeFantasia,
      empresaRazao: empresa.razaoSocial,
      empresaCnpj: empresa.cnpj,
      empresaTelefone: empresa.telefone,
      empresaEmail: empresa.email,
    })
    .from(solicitacaoAlteracaoEmpresa)
    .innerJoin(empresa, eq(empresa.id, solicitacaoAlteracaoEmpresa.empresaId))
    .where(eq(solicitacaoAlteracaoEmpresa.status, 'PENDENTE'))
    .orderBy(desc(solicitacaoAlteracaoEmpresa.criadoEm));

  return ok(
    registros.map((r) => ({
      ...r.solicitacao,
      criadoEm: new Date(r.solicitacao.criadoEm).toISOString(),
      empresaNome: r.empresaNome,
      diff: descreverPedido(
        {
          razaoSocial: r.empresaRazao,
          nomeFantasia: r.empresaNome,
          cnpj: r.empresaCnpj,
          telefone: r.empresaTelefone,
          email: r.empresaEmail,
        },
        {
          razaoSocial: r.solicitacao.razaoSocial,
          nomeFantasia: r.solicitacao.nomeFantasia,
          cnpj: r.solicitacao.cnpj,
          telefone: r.solicitacao.telefone,
          email: r.solicitacao.email,
        },
      ),
    })),
  );
}

export async function decidirSolicitacao(
  contexto: Contexto,
  id: number,
  aprovar: boolean,
  motivo: string | null,
): Promise<Result<{ id: number }>> {
  const permissao = exigirSuperAdmin(contexto);
  if (!permissao.ok) return permissao;

  const [pedido] = await db
    .select()
    .from(solicitacaoAlteracaoEmpresa)
    .where(eq(solicitacaoAlteracaoEmpresa.id, id))
    .limit(1);

  if (pedido === undefined) return falha(naoEncontrado('Solicitação não encontrada.'));
  if (pedido.status !== 'PENDENTE') {
    return falha(conflito('Esta solicitação já foi decidida.'));
  }

  if (aprovar) {
    const [cnpjEmUso] = await db
      .select({ id: empresa.id })
      .from(empresa)
      .where(and(eq(empresa.cnpj, pedido.cnpj), ne(empresa.id, pedido.empresaId)))
      .limit(1);
    if (cnpjEmUso !== undefined) {
      return falha(conflito('CNPJ já cadastrado em outra empresa.', 'cnpj'));
    }
  }

  await db.transaction(async (tx) => {
    if (aprovar) {
      await tx
        .update(empresa)
        .set({
          razaoSocial: pedido.razaoSocial,
          nomeFantasia: pedido.nomeFantasia,
          cnpj: pedido.cnpj,
          telefone: pedido.telefone,
          email: pedido.email,
        })
        .where(eq(empresa.id, pedido.empresaId));
    }

    await tx
      .update(solicitacaoAlteracaoEmpresa)
      .set({
        status: aprovar ? 'APROVADA' : 'REJEITADA',
        decididoPor: contexto.usuario.usuarioId,
        decididoEm: new Date(),
        motivo: aprovar ? null : (motivo ?? 'Solicitação rejeitada pela EsteticaFlow.'),
      })
      .where(eq(solicitacaoAlteracaoEmpresa.id, id));

    await tx
      .update(notificacao)
      .set({ lida: true })
      .where(
        and(
          isNull(notificacao.empresaId),
          eq(notificacao.referenciaTipo, 'SOLICITACAO'),
          eq(notificacao.referenciaId, id),
        ),
      );
  });

  await notificarEmpresa({
    empresaId: pedido.empresaId,
    tipo: 'SOLICITACAO_DECISAO',
    titulo: aprovar ? 'Alteração cadastral aprovada' : 'Alteração cadastral rejeitada',
    mensagem: aprovar
      ? 'A EsteticaFlow aprovou a alteração dos dados cadastrais da empresa.'
      : `A EsteticaFlow rejeitou a alteração. Motivo: ${motivo ?? 'não informado'}.`,
    referenciaTipo: 'SOLICITACAO_DECISAO',
    referenciaId: id,
    acaoUrl: '/painel/notificacoes',
    novaSempre: true,
  });

  await registrar({
    empresaId: pedido.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: aprovar ? 'SOLICITACAO_APROVADA' : 'SOLICITACAO_REJEITADA',
    detalhes: `Solicitação ${id}`,
  });

  return ok({ id });
}

/** Aviso a plataforma de que ha uma solicitacao aguardando analise. */
export async function avisarPlataformaSobreSolicitacao(
  solicitacaoId: number,
  nomeEmpresa: string,
  diff: string,
): Promise<void> {
  await notificarPlataforma({
    tipo: 'SOLICITACAO_EMPRESA',
    titulo: `Solicitação de alteração: ${nomeEmpresa}`,
    mensagem: `A empresa pediu alteração dos dados cadastrais.\n\n${diff}`,
    referenciaTipo: 'SOLICITACAO',
    referenciaId: solicitacaoId,
    acaoUrl: '/painel/plataforma',
  });
}
