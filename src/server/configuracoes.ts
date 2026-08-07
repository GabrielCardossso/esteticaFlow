import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import {
  exigirAdministrador,
  exigirAdministradorDaEmpresa,
  exigirRecurso,
} from '@/auth/contexto';
import { gerarHash } from '@/auth/senha';
import { db } from '@/db/client';
import {
  configuracao,
  empresa as tabelaEmpresa,
  formaPagamento,
  historicoAcesso,
  solicitacaoAlteracaoEmpresa,
  usuario,
} from '@/db/schema';
import { limiteDeUsuarios, type Papel } from '@/domain/plano';
import { conflito, falha, naoEncontrado, ok, validacao, type Result } from '@/domain/result';
import { formatarCpfCnpj, formatarTelefone } from '@/domain/shared/documento';
import {
  CHAVE_SESSAO_ATIVA,
  CHAVE_SESSAO_MINUTOS,
  CHAVE_TEMA_COR,
  CHAVE_TEMA_HEX,
  CHAVE_TEMA_MODO,
  resolverMinutos,
  resolverTema,
  type ModoTema,
} from '@/domain/tema';
import type {
  DadosEmpresaPayload,
  FormaPagamentoInput,
  SessaoInput,
  TemaPayload,
  UsuarioPayload,
} from '@/schemas';
import { registrar } from './log';

// ---------------------------------------------------------------------------
// Parametros chave-valor
// ---------------------------------------------------------------------------

export async function lerParametros(empresaId: number): Promise<Map<string, string>> {
  const registros = await db
    .select({ chave: configuracao.chave, valor: configuracao.valor })
    .from(configuracao)
    .where(eq(configuracao.empresaId, empresaId));
  return new Map(registros.map((r) => [r.chave, r.valor]));
}

export async function gravarParametro(
  empresaId: number,
  chave: string,
  valor: string,
): Promise<void> {
  await db
    .insert(configuracao)
    .values({ empresaId, chave, valor })
    .onConflictDoUpdate({
      target: [configuracao.empresaId, configuracao.chave],
      set: { valor },
    });
}

export interface PreferenciasDaEmpresa {
  acento: string;
  hex: string;
  modo: ModoTema;
  inatividadeAtiva: boolean;
  inatividadeMinutos: number;
  podePersonalizar: boolean;
}

export async function lerPreferencias(contexto: Contexto): Promise<PreferenciasDaEmpresa> {
  const parametros = await lerParametros(contexto.empresaId);
  const podePersonalizar = contexto.permite('PERSONALIZACAO_TEMA');
  const tema = resolverTema(
    {
      cor: parametros.get(CHAVE_TEMA_COR),
      hex: parametros.get(CHAVE_TEMA_HEX),
      modo: parametros.get(CHAVE_TEMA_MODO),
    },
    podePersonalizar,
  );

  return {
    ...tema,
    inatividadeAtiva: parametros.get(CHAVE_SESSAO_ATIVA) === 'true',
    inatividadeMinutos: resolverMinutos(parametros.get(CHAVE_SESSAO_MINUTOS)),
    podePersonalizar,
  };
}

export async function salvarTema(
  contexto: Contexto,
  dados: TemaPayload,
): Promise<Result<PreferenciasDaEmpresa>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;

  // O modo claro/escuro e preferencia de leitura: liberado em qualquer plano.
  await gravarParametro(contexto.empresaId, CHAVE_TEMA_MODO, dados.modo);

  const recurso = exigirRecurso(contexto, 'PERSONALIZACAO_TEMA');
  if (recurso.ok) {
    if (dados.acento === 'personalizado' && dados.hex === undefined) {
      return falha(validacao('Informe a cor personalizada no formato #RRGGBB.', 'hex'));
    }
    await gravarParametro(contexto.empresaId, CHAVE_TEMA_COR, dados.acento);
    if (dados.hex !== undefined) {
      await gravarParametro(contexto.empresaId, CHAVE_TEMA_HEX, dados.hex.toLowerCase());
    }
    await registrar({
      empresaId: contexto.empresaId,
      usuarioId: contexto.usuario.usuarioId,
      acao: 'TEMA_ALTERADO',
      detalhes: `Acento ${dados.acento}, modo ${dados.modo}`,
    });
  }

  return ok(await lerPreferencias(contexto));
}

export async function salvarSessao(
  contexto: Contexto,
  dados: SessaoInput,
): Promise<Result<PreferenciasDaEmpresa>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;

  await gravarParametro(
    contexto.empresaId,
    CHAVE_SESSAO_ATIVA,
    String(dados.inatividadeAtiva ?? false),
  );
  await gravarParametro(contexto.empresaId, CHAVE_SESSAO_MINUTOS, String(dados.minutos ?? 30));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'SESSAO_CONFIGURADA',
    detalhes: `Inatividade ${dados.inatividadeAtiva ? 'ativa' : 'inativa'}`,
  });

  return ok(await lerPreferencias(contexto));
}

// ---------------------------------------------------------------------------
// Usuarios da empresa
// ---------------------------------------------------------------------------

export interface UsuarioDaLista {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimoAcesso: string | null;
}

export async function listarUsuarios(
  contexto: Contexto,
  incluirInativos: boolean,
): Promise<Result<{ usuarios: UsuarioDaLista[]; limite: number; ativos: number }>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;

  const condicoes = [eq(usuario.empresaId, contexto.empresaId)];
  if (!incluirInativos) condicoes.push(eq(usuario.ativo, true));

  const registros = await db
    .select({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      ativo: usuario.ativo,
      ultimoAcesso: sql<Date | null>`(
        select max(${historicoAcesso.ocorridoEm})
        from ${historicoAcesso}
        where ${historicoAcesso.usuarioId} = ${usuario.id}
      )`,
    })
    .from(usuario)
    .where(and(...condicoes))
    .orderBy(desc(usuario.ativo), usuario.nome);

  const [contagem] = await db
    .select({ total: count() })
    .from(usuario)
    .where(
      and(
        eq(usuario.empresaId, contexto.empresaId),
        eq(usuario.ativo, true),
        ne(usuario.papel, 'SUPER_ADMIN'),
      ),
    );

  return ok({
    usuarios: registros.map((r) => ({
      ...r,
      ultimoAcesso: r.ultimoAcesso === null ? null : new Date(r.ultimoAcesso).toISOString(),
    })),
    limite: limiteDeUsuarios(contexto.empresa.plano),
    ativos: Number(contagem?.total ?? 0),
  });
}

async function contarUsuariosAtivos(empresaId: number): Promise<number> {
  const [contagem] = await db
    .select({ total: count() })
    .from(usuario)
    .where(
      and(eq(usuario.empresaId, empresaId), eq(usuario.ativo, true), ne(usuario.papel, 'SUPER_ADMIN')),
    );
  return Number(contagem?.total ?? 0);
}

export async function criarUsuario(
  contexto: Contexto,
  dados: UsuarioPayload,
): Promise<Result<{ id: number }>> {
  const admin = exigirAdministradorDaEmpresa(contexto);
  if (!admin.ok) return admin;

  if (dados.senha === undefined) {
    return falha(validacao('Informe uma senha para o novo usuário.', 'senha'));
  }

  const [existente] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.email, dados.email))
    .limit(1);

  if (existente !== undefined) {
    return falha(conflito('Este e-mail já está em uso.', 'email'));
  }

  const limite = limiteDeUsuarios(contexto.empresa.plano);
  const ativos = await contarUsuariosAtivos(contexto.empresaId);
  if (ativos >= limite) {
    return falha(
      conflito(
        `O plano ${contexto.empresa.plano === 'BASICO' ? 'Básico' : 'Pro'} permite ${limite} usuários ativos. Faça upgrade para adicionar mais.`,
      ),
    );
  }

  const [criado] = await db
    .insert(usuario)
    .values({
      empresaId: contexto.empresaId,
      nome: dados.nome,
      email: dados.email,
      senhaHash: await gerarHash(dados.senha),
      papel: dados.papel,
    })
    .returning({ id: usuario.id });

  if (criado === undefined) return falha(naoEncontrado('Não foi possível criar o usuário.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'USUARIO_CRIADO',
    detalhes: `Usuário ${criado.id} — ${dados.email}`,
  });

  return ok({ id: criado.id });
}

export async function atualizarUsuario(
  contexto: Contexto,
  id: number,
  dados: UsuarioPayload,
): Promise<Result<{ id: number }>> {
  const admin = exigirAdministradorDaEmpresa(contexto);
  if (!admin.ok) return admin;

  const [alvo] = await db
    .select({ id: usuario.id, papel: usuario.papel })
    .from(usuario)
    .where(and(eq(usuario.id, id), eq(usuario.empresaId, contexto.empresaId)))
    .limit(1);

  if (alvo === undefined) return falha(naoEncontrado('Usuário não encontrado.'));
  if (alvo.papel === 'SUPER_ADMIN') {
    return falha(conflito('O administrador da plataforma não pode ser editado aqui.'));
  }

  const [duplicado] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(and(eq(usuario.email, dados.email), ne(usuario.id, id)))
    .limit(1);

  if (duplicado !== undefined) return falha(conflito('Este e-mail já está em uso.', 'email'));

  const atualizacao: Partial<typeof usuario.$inferInsert> = {
    nome: dados.nome,
    email: dados.email,
    papel: dados.papel,
  };
  if (dados.senha !== undefined && dados.senha !== '') {
    atualizacao.senhaHash = await gerarHash(dados.senha);
  }

  await db
    .update(usuario)
    .set(atualizacao)
    .where(and(eq(usuario.id, id), eq(usuario.empresaId, contexto.empresaId)));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'USUARIO_ATUALIZADO',
    detalhes: `Usuário ${id} — ${dados.email}`,
  });

  return ok({ id });
}

export async function alternarUsuarioAtivo(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const admin = exigirAdministradorDaEmpresa(contexto);
  if (!admin.ok) return admin;

  if (id === contexto.usuario.usuarioId && !ativo) {
    return falha(conflito('Você não pode arquivar o próprio usuário.'));
  }

  const [alvo] = await db
    .select({ papel: usuario.papel, ativo: usuario.ativo })
    .from(usuario)
    .where(and(eq(usuario.id, id), eq(usuario.empresaId, contexto.empresaId)))
    .limit(1);

  if (alvo === undefined) return falha(naoEncontrado('Usuário não encontrado.'));
  if (alvo.papel === 'SUPER_ADMIN') {
    return falha(conflito('O administrador da plataforma não pode ser alterado aqui.'));
  }

  if (ativo && !alvo.ativo) {
    const limite = limiteDeUsuarios(contexto.empresa.plano);
    const ativos = await contarUsuariosAtivos(contexto.empresaId);
    if (ativos >= limite) {
      return falha(conflito(`O plano atual permite ${limite} usuários ativos.`));
    }
  }

  const [atualizado] = await db
    .update(usuario)
    .set({ ativo })
    .where(and(eq(usuario.id, id), eq(usuario.empresaId, contexto.empresaId)))
    .returning({ id: usuario.id, ativo: usuario.ativo });

  if (atualizado === undefined) return falha(naoEncontrado('Usuário não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'USUARIO_REATIVADO' : 'USUARIO_ARQUIVADO',
    detalhes: `Usuário ${id}`,
  });

  return ok(atualizado);
}

// ---------------------------------------------------------------------------
// Dados cadastrais da empresa
// ---------------------------------------------------------------------------

function descreverAlteracao(
  campo: string,
  atual: string | null,
  proposto: string | null,
): string {
  const de = atual === null || atual === '' ? '(vazio)' : atual;
  const para = proposto === null || proposto === '' ? '(vazio)' : proposto;
  if (de.toLowerCase() === para.toLowerCase()) return `• ${campo}: ${para} (sem alteração)`;
  return `• ${campo}: ${de} → ${para}`;
}

export function descreverPedido(
  atual: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string | null;
    email: string | null;
  },
  proposto: DadosEmpresaPayload,
): string {
  return [
    descreverAlteracao('Razão social', atual.razaoSocial, proposto.razaoSocial),
    descreverAlteracao('Nome fantasia', atual.nomeFantasia, proposto.nomeFantasia),
    descreverAlteracao('CNPJ', formatarCpfCnpj(atual.cnpj), formatarCpfCnpj(proposto.cnpj)),
    descreverAlteracao(
      'Telefone',
      atual.telefone === null ? null : formatarTelefone(atual.telefone),
      proposto.telefone === null ? null : formatarTelefone(proposto.telefone),
    ),
    descreverAlteracao('E-mail', atual.email, proposto.email),
  ].join('\n');
}

/**
 * A empresa nao altera o proprio cadastro diretamente: o administrador envia
 * uma solicitacao e a plataforma aprova. Isso protege dados fiscais.
 */
export async function solicitarAlteracaoCadastral(
  contexto: Contexto,
  dados: DadosEmpresaPayload,
): Promise<Result<{ id: number; pendente: true }>> {
  const admin = exigirAdministradorDaEmpresa(contexto);
  if (!admin.ok) return admin;

  const [pendente] = await db
    .select({ id: solicitacaoAlteracaoEmpresa.id })
    .from(solicitacaoAlteracaoEmpresa)
    .where(
      and(
        eq(solicitacaoAlteracaoEmpresa.empresaId, contexto.empresaId),
        eq(solicitacaoAlteracaoEmpresa.status, 'PENDENTE'),
      ),
    )
    .limit(1);

  if (pendente !== undefined) {
    return falha(
      conflito('Já existe uma solicitação pendente. Aguarde a análise da EsteticaFlow.'),
    );
  }

  const [cnpjEmUso] = await db
    .select({ id: tabelaEmpresa.id })
    .from(tabelaEmpresa)
    .where(and(eq(tabelaEmpresa.cnpj, dados.cnpj), ne(tabelaEmpresa.id, contexto.empresaId)))
    .limit(1);

  if (cnpjEmUso !== undefined) {
    return falha(conflito('Este CNPJ já está cadastrado em outra empresa.', 'cnpj'));
  }

  const [criada] = await db
    .insert(solicitacaoAlteracaoEmpresa)
    .values({
      empresaId: contexto.empresaId,
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      telefone: dados.telefone,
      email: dados.email,
      solicitadoPor: contexto.usuario.usuarioId,
    })
    .returning({ id: solicitacaoAlteracaoEmpresa.id });

  if (criada === undefined) {
    return falha(naoEncontrado('Não foi possível registrar a solicitação.'));
  }

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'SOLICITACAO_CRIADA',
    detalhes: `Solicitação ${criada.id}`,
  });

  return ok({ id: criada.id, pendente: true });
}

export async function solicitacaoPendente(contexto: Contexto) {
  const [pendente] = await db
    .select()
    .from(solicitacaoAlteracaoEmpresa)
    .where(
      and(
        eq(solicitacaoAlteracaoEmpresa.empresaId, contexto.empresaId),
        eq(solicitacaoAlteracaoEmpresa.status, 'PENDENTE'),
      ),
    )
    .limit(1);
  return pendente ?? null;
}

// ---------------------------------------------------------------------------
// Formas de pagamento
// ---------------------------------------------------------------------------

export async function criarFormaPagamento(
  contexto: Contexto,
  dados: FormaPagamentoInput,
): Promise<Result<{ id: number }>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;
  const recurso = exigirRecurso(contexto, 'FINANCEIRO');
  if (!recurso.ok) return recurso;

  const nome = dados.nome.trim();
  const [existente] = await db
    .select({ id: formaPagamento.id })
    .from(formaPagamento)
    .where(
      and(
        eq(formaPagamento.empresaId, contexto.empresaId),
        sql`lower(${formaPagamento.nome}) = lower(${nome})`,
      ),
    )
    .limit(1);

  if (existente !== undefined) {
    return falha(conflito('Já existe uma forma de pagamento com este nome.', 'nome'));
  }

  const [criada] = await db
    .insert(formaPagamento)
    .values({ empresaId: contexto.empresaId, nome })
    .returning({ id: formaPagamento.id });

  if (criada === undefined) return falha(naoEncontrado('Não foi possível criar.'));
  return ok({ id: criada.id });
}

export async function atualizarFormaPagamento(
  contexto: Contexto,
  id: number,
  dados: FormaPagamentoInput,
): Promise<Result<{ id: number }>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;

  const [atualizada] = await db
    .update(formaPagamento)
    .set({ nome: dados.nome.trim() })
    .where(and(eq(formaPagamento.id, id), eq(formaPagamento.empresaId, contexto.empresaId)))
    .returning({ id: formaPagamento.id });

  if (atualizada === undefined) return falha(naoEncontrado('Forma de pagamento não encontrada.'));
  return ok({ id: atualizada.id });
}

export async function alternarFormaPagamentoAtiva(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const admin = exigirAdministrador(contexto);
  if (!admin.ok) return admin;

  const [atualizada] = await db
    .update(formaPagamento)
    .set({ ativo })
    .where(and(eq(formaPagamento.id, id), eq(formaPagamento.empresaId, contexto.empresaId)))
    .returning({ id: formaPagamento.id, ativo: formaPagamento.ativo });

  if (atualizada === undefined) return falha(naoEncontrado('Forma de pagamento não encontrada.'));
  return ok(atualizada);
}

export async function ultimosAcessos(contexto: Contexto, limite = 10) {
  const registros = await db
    .select({
      id: historicoAcesso.id,
      ocorridoEm: historicoAcesso.ocorridoEm,
      ip: historicoAcesso.ip,
      navegador: historicoAcesso.navegador,
      sistemaOperacional: historicoAcesso.sistemaOperacional,
      usuarioNome: usuario.nome,
    })
    .from(historicoAcesso)
    .innerJoin(usuario, eq(usuario.id, historicoAcesso.usuarioId))
    .where(eq(historicoAcesso.empresaId, contexto.empresaId))
    .orderBy(desc(historicoAcesso.ocorridoEm))
    .limit(limite);

  return registros.map((r) => ({ ...r, ocorridoEm: new Date(r.ocorridoEm).toISOString() }));
}
