import { and, count, desc, eq, isNull, notInArray } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { notificacao } from '@/db/schema';
import { precisaReativacao } from '@/domain/cliente';
import { diasEmAtraso } from '@/domain/plano';
import { falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { hojeISO } from '@/domain/shared/tempo';
import { truncar } from '@/domain/shared/texto';
import { alertasDeEstoque } from './estoque';
import { listarClientes } from './clientes';

type TipoNotificacao =
  | 'ESTOQUE_BAIXO'
  | 'CLIENTE_INATIVO'
  | 'ASSINATURA'
  | 'SOLICITACAO_EMPRESA'
  | 'SOLICITACAO_DECISAO'
  | 'SISTEMA';

interface EntradaNotificacao {
  empresaId: number | null;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  referenciaTipo?: string | null;
  referenciaId?: number | null;
  acaoUrl?: string | null;
  /** Ignora a deduplicacao; usado em decisoes que precisam sempre notificar. */
  novaSempre?: boolean;
}

/**
 * Deduplicacao por referencia e ciclo ativo: ler um alerta nao significa que
 * a condicao que o causou foi resolvida. Um novo aviso so nasce depois que o
 * alerta anterior for encerrado pela sincronizacao operacional.
 */
async function criar(entrada: EntradaNotificacao): Promise<number | null> {
  const {
    empresaId,
    tipo,
    titulo,
    mensagem,
    referenciaTipo = null,
    referenciaId = null,
    acaoUrl = null,
    novaSempre = false,
  } = entrada;

  if (!novaSempre && referenciaTipo !== null && referenciaId !== null) {
    const [existente] = await db
      .select({ id: notificacao.id })
      .from(notificacao)
      .where(
        and(
          empresaId === null ? isNull(notificacao.empresaId) : eq(notificacao.empresaId, empresaId),
          eq(notificacao.tipo, tipo),
          eq(notificacao.referenciaTipo, referenciaTipo),
          eq(notificacao.referenciaId, referenciaId),
          eq(notificacao.ativa, true),
        ),
      )
      .limit(1);
    if (existente !== undefined) return null;
  }

  const [criada] = await db
    .insert(notificacao)
    .values({
      empresaId,
      tipo,
      titulo: truncar(titulo, 150),
      mensagem: truncar(mensagem, 1000),
      ativa: !novaSempre,
      referenciaTipo,
      referenciaId,
      acaoUrl,
    })
    .returning({ id: notificacao.id });

  return criada?.id ?? null;
}

export async function notificarEmpresa(
  entrada: Omit<EntradaNotificacao, 'empresaId'> & { empresaId: number },
): Promise<number | null> {
  return criar(entrada);
}

export async function notificarPlataforma(
  entrada: Omit<EntradaNotificacao, 'empresaId'>,
): Promise<number | null> {
  return criar({ ...entrada, empresaId: null });
}

/** Encerra alertas operacionais que ja nao representam o estado atual. */
async function encerrarAlertasAusentes(
  empresaId: number,
  tipo: TipoNotificacao,
  referenciaTipo: string,
  referenciasAtivas: readonly number[],
): Promise<void> {
  const condicoes = [
    eq(notificacao.empresaId, empresaId),
    eq(notificacao.tipo, tipo),
    eq(notificacao.referenciaTipo, referenciaTipo),
    eq(notificacao.ativa, true),
  ];

  if (referenciasAtivas.length > 0) {
    condicoes.push(notInArray(notificacao.referenciaId, [...referenciasAtivas]));
  }

  await db
    .update(notificacao)
    .set({ ativa: false, lida: true })
    .where(and(...condicoes));
}

export interface NotificacaoDaLista {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  acaoUrl: string | null;
  criadoEm: string;
}

/**
 * Sincroniza os alertas operacionais antes de listar. Sao derivados do estado
 * atual (estoque baixo, assinatura em atraso, clientes sem retorno), entao
 * recalcular na leitura mantem a caixa sempre coerente.
 */
async function sincronizarAlertas(contexto: Contexto): Promise<void> {
  if (contexto.usuario.ehSuperAdmin) return;

  if (contexto.empresa.statusAssinatura === 'EM_ATRASO') {
    const dias = diasEmAtraso(contexto.empresa.proximoVencimento, hojeISO());
    await notificarEmpresa({
      empresaId: contexto.empresaId,
      tipo: 'ASSINATURA',
      titulo: 'Assinatura em atraso',
      mensagem: `A assinatura está em atraso há ${dias} ${dias === 1 ? 'dia' : 'dias'}. Regularize para evitar o bloqueio do acesso.`,
      referenciaTipo: 'ASSINATURA_ATRASO',
      referenciaId: contexto.empresaId,
      acaoUrl: '/painel/configuracoes',
    });
  } else {
    await encerrarAlertasAusentes(contexto.empresaId, 'ASSINATURA', 'ASSINATURA_ATRASO', []);
  }

  if (contexto.permite('ESTOQUE')) {
    const alertas = await alertasDeEstoque(contexto);

    // Alerta de estoque descreve um estado atual, não um evento histórico.
    // Ao repor um produto, o aviso pendente precisa deixar de contar como
    // notificação ativa, mesmo se o usuário não abrir a tela de estoque.
    const idsEmAlerta = alertas.map((alerta) => alerta.produtoId);
    await encerrarAlertasAusentes(contexto.empresaId, 'ESTOQUE_BAIXO', 'PRODUTO', idsEmAlerta);

    for (const alerta of alertas.slice(0, 20)) {
      await notificarEmpresa({
        empresaId: contexto.empresaId,
        tipo: 'ESTOQUE_BAIXO',
        titulo: `Estoque baixo: ${alerta.nome}`,
        mensagem: `Saldo atual de ${alerta.quantidadeAtual} ${alerta.unidadeMedida} (mínimo ${alerta.quantidadeMinima}). Reponha para não interromper atendimentos.`,
        referenciaTipo: 'PRODUTO',
        referenciaId: alerta.produtoId,
        acaoUrl: '/painel/estoque',
      });
    }
  }

  const clientes = await listarClientes(contexto, {
    busca: '',
    situacao: 'ativos',
    relacionamento: 'todos',
    ordenacao: 'ultimo_atendimento',
  });

  if (clientes.ok) {
    const paraReativar = clientes.value
      .filter((c) => precisaReativacao(c.relacionamento))
      .slice(0, 10);
    await encerrarAlertasAusentes(
      contexto.empresaId,
      'CLIENTE_INATIVO',
      'CLIENTE',
      paraReativar.map((cliente) => cliente.id),
    );
    for (const cliente of paraReativar) {
      await notificarEmpresa({
        empresaId: contexto.empresaId,
        tipo: 'CLIENTE_INATIVO',
        titulo: `${cliente.relacionamento === 'INATIVO' ? 'Cliente inativo' : 'Cliente em risco'}: ${cliente.nome}`,
        mensagem:
          'Considere um contato de reativação. O histórico completo está na ficha do cliente.',
        referenciaTipo: 'CLIENTE',
        referenciaId: cliente.id,
        acaoUrl: `/painel/clientes/${cliente.id}`,
      });
    }
  }
}

export async function listarNotificacoes(
  contexto: Contexto,
): Promise<Result<NotificacaoDaLista[]>> {
  await sincronizarAlertas(contexto);

  const escopo = contexto.usuario.ehSuperAdmin
    ? isNull(notificacao.empresaId)
    : eq(notificacao.empresaId, contexto.empresaId);

  const registros = await db
    .select()
    .from(notificacao)
    .where(escopo)
    .orderBy(desc(notificacao.criadoEm))
    .limit(100);

  return ok(
    registros.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      mensagem: r.mensagem,
      lida: r.lida,
      acaoUrl: r.acaoUrl,
      criadoEm: new Date(r.criadoEm).toISOString(),
    })),
  );
}

export async function contarNaoLidas(contexto: Contexto): Promise<number> {
  const escopo = contexto.usuario.ehSuperAdmin
    ? isNull(notificacao.empresaId)
    : eq(notificacao.empresaId, contexto.empresaId);

  const [contagem] = await db
    .select({ total: count() })
    .from(notificacao)
    .where(and(escopo, eq(notificacao.lida, false)));

  return Number(contagem?.total ?? 0);
}

export async function marcarComoLida(
  contexto: Contexto,
  id: number,
): Promise<Result<{ id: number }>> {
  const escopo = contexto.usuario.ehSuperAdmin
    ? isNull(notificacao.empresaId)
    : eq(notificacao.empresaId, contexto.empresaId);

  const [atualizada] = await db
    .update(notificacao)
    .set({ lida: true })
    .where(and(eq(notificacao.id, id), escopo))
    .returning({ id: notificacao.id });

  if (atualizada === undefined) return falha(naoEncontrado('Notificação não encontrada.'));
  return ok(atualizada);
}

export async function marcarTodasComoLidas(contexto: Contexto): Promise<Result<{ total: number }>> {
  const escopo = contexto.usuario.ehSuperAdmin
    ? isNull(notificacao.empresaId)
    : eq(notificacao.empresaId, contexto.empresaId);

  const atualizadas = await db
    .update(notificacao)
    .set({ lida: true })
    .where(and(escopo, eq(notificacao.lida, false)))
    .returning({ id: notificacao.id });

  return ok({ total: atualizadas.length });
}
