import { and, count, desc, eq, isNotNull, max, ne, sum } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamento, cliente, receita, veiculo } from '@/db/schema';
import {
  classificarRelacionamento,
  linkMapa,
  linkWhatsApp,
  type Relacionamento,
} from '@/domain/cliente';
import { conflito, falha, naoEncontrado, ok, type Result } from '@/domain/result';
import { Dinheiro } from '@/domain/shared/decimal';
import { contemTermo } from '@/domain/shared/texto';
import type { ClientePayload, FiltroClientes, VeiculoPayload } from '@/schemas';
import { registrar } from './log';

export interface ClienteDaLista {
  id: number;
  nome: string;
  telefone: string;
  cpfCnpj: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  totalVeiculos: number;
  totalAtendimentos: number;
  valorTotalGasto: string;
  ultimoAtendimento: string | null;
  relacionamento: Relacionamento;
  whatsapp: string | null;
}

/**
 * Listagem com os agregados de relacionamento. As metricas vem de uma unica
 * consulta agrupada, nao de N+1 por cliente.
 */
export async function listarClientes(
  contexto: Contexto,
  filtro: FiltroClientes,
): Promise<Result<ClienteDaLista[]>> {
  const condicoes = [eq(cliente.empresaId, contexto.empresaId)];
  if (filtro.situacao === 'ativos') condicoes.push(eq(cliente.ativo, true));
  if (filtro.situacao === 'inativos') condicoes.push(eq(cliente.ativo, false));

  const registros = await db
    .select({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      cpfCnpj: cliente.cpfCnpj,
      email: cliente.email,
      cidade: cliente.cidade,
      uf: cliente.uf,
      ativo: cliente.ativo,
    })
    .from(cliente)
    .where(and(...condicoes))
    .orderBy(cliente.nome);

  if (registros.length === 0) return ok([]);

  const [veiculosPorCliente, metricas] = await Promise.all([
    db
      .select({ clienteId: veiculo.clienteId, total: count() })
      .from(veiculo)
      .where(and(eq(veiculo.empresaId, contexto.empresaId), eq(veiculo.ativo, true)))
      .groupBy(veiculo.clienteId),
    db
      .select({
        clienteId: agendamento.clienteId,
        total: count(),
        gasto: sum(agendamento.total),
        ultimo: max(agendamento.dataHora),
      })
      .from(agendamento)
      .where(
        and(eq(agendamento.empresaId, contexto.empresaId), eq(agendamento.status, 'CONCLUIDO')),
      )
      .groupBy(agendamento.clienteId),
  ]);

  const mapaVeiculos = new Map(veiculosPorCliente.map((v) => [v.clienteId, Number(v.total)]));
  const mapaMetricas = new Map(metricas.map((m) => [m.clienteId, m]));

  const termo = filtro.busca.trim();
  const digitos = termo.replace(/\D/g, '');

  const lista: ClienteDaLista[] = registros
    .filter((registro) => {
      if (termo === '') return true;
      if (contemTermo(registro.nome, termo)) return true;
      if (contemTermo(registro.email, termo)) return true;
      if (contemTermo(registro.cidade, termo)) return true;
      if (
        digitos !== '' &&
        (registro.telefone.includes(digitos) || (registro.cpfCnpj ?? '').includes(digitos))
      ) {
        return true;
      }
      return false;
    })
    .map((registro) => {
      const metrica = mapaMetricas.get(registro.id);
      const ultimo = metrica?.ultimo ?? null;
      const ultimoIso = ultimo === null ? null : new Date(ultimo).toISOString();
      return {
        ...registro,
        totalVeiculos: mapaVeiculos.get(registro.id) ?? 0,
        totalAtendimentos: Number(metrica?.total ?? 0),
        valorTotalGasto: Dinheiro.de(metrica?.gasto ?? '0'),
        ultimoAtendimento: ultimoIso,
        relacionamento: classificarRelacionamento(ultimoIso),
        whatsapp: linkWhatsApp(registro.telefone),
      } satisfies ClienteDaLista;
    })
    .filter(
      (item) => filtro.relacionamento === 'todos' || item.relacionamento === filtro.relacionamento,
    );

  const ordenada = [...lista].sort((a, b) => {
    switch (filtro.ordenacao) {
      case 'ultimo_atendimento': {
        if (a.ultimoAtendimento === b.ultimoAtendimento)
          return a.nome.localeCompare(b.nome, 'pt-BR');
        if (a.ultimoAtendimento === null) return 1;
        if (b.ultimoAtendimento === null) return -1;
        return b.ultimoAtendimento.localeCompare(a.ultimoAtendimento);
      }
      case 'valor_gasto':
        return Dinheiro.comparar(b.valorTotalGasto, a.valorTotalGasto);
      case 'atendimentos':
        return b.totalAtendimentos - a.totalAtendimentos;
      default:
        return a.nome.localeCompare(b.nome, 'pt-BR');
    }
  });

  return ok(ordenada);
}

export interface DetalheCliente {
  cliente: typeof cliente.$inferSelect;
  relacionamento: Relacionamento;
  totalAtendimentos: number;
  valorTotalGasto: string;
  ticketMedio: string;
  ultimoAtendimento: string | null;
  whatsapp: string | null;
  mapa: string | null;
  veiculos: Array<typeof veiculo.$inferSelect>;
  historico: Array<{
    id: number;
    dataHora: string;
    status: string;
    total: string;
    pago: boolean;
    veiculo: string;
  }>;
  financeiro: Array<{
    id: number;
    descricao: string;
    valor: string;
    dataRecebimento: string;
    formaPagamento: string | null;
  }>;
}

export async function obterCliente(
  contexto: Contexto,
  id: number,
): Promise<Result<DetalheCliente>> {
  const [registro] = await db
    .select()
    .from(cliente)
    .where(and(eq(cliente.id, id), eq(cliente.empresaId, contexto.empresaId)))
    .limit(1);

  if (registro === undefined) return falha(naoEncontrado('Cliente não encontrado.'));

  const veiculos = await db
    .select()
    .from(veiculo)
    .where(and(eq(veiculo.clienteId, id), eq(veiculo.empresaId, contexto.empresaId)))
    .orderBy(desc(veiculo.ativo), veiculo.modelo);

  const historicoBruto = await db
    .select({
      id: agendamento.id,
      dataHora: agendamento.dataHora,
      status: agendamento.status,
      total: agendamento.total,
      pago: agendamento.pago,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
    })
    .from(agendamento)
    .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
    .where(and(eq(agendamento.clienteId, id), eq(agendamento.empresaId, contexto.empresaId)))
    .orderBy(desc(agendamento.dataHora))
    .limit(50);

  const financeiroBruto = await db
    .select({
      id: receita.id,
      descricao: receita.descricao,
      valor: receita.valor,
      dataRecebimento: receita.dataRecebimento,
    })
    .from(receita)
    .innerJoin(agendamento, eq(agendamento.id, receita.agendamentoId))
    .where(and(eq(agendamento.clienteId, id), eq(receita.empresaId, contexto.empresaId)))
    .orderBy(desc(receita.dataRecebimento))
    .limit(50);

  const concluidos = historicoBruto.filter((h) => h.status === 'CONCLUIDO');
  const valorTotalGasto = Dinheiro.somar(...concluidos.map((h) => h.total), '0');
  const ultimo = concluidos[0]?.dataHora ?? null;
  const ultimoIso = ultimo === null ? null : new Date(ultimo).toISOString();

  return ok({
    cliente: registro,
    relacionamento: classificarRelacionamento(ultimoIso),
    totalAtendimentos: concluidos.length,
    valorTotalGasto,
    ticketMedio:
      concluidos.length > 0 ? Dinheiro.dividir(valorTotalGasto, concluidos.length) : Dinheiro.zero,
    ultimoAtendimento: ultimoIso,
    whatsapp: linkWhatsApp(registro.telefone),
    mapa: linkMapa(registro),
    veiculos,
    historico: historicoBruto.map((h) => ({
      id: h.id,
      dataHora: new Date(h.dataHora).toISOString(),
      status: h.status,
      total: h.total,
      pago: h.pago,
      veiculo: `${h.modelo} · ${h.placa}`,
    })),
    financeiro: financeiroBruto.map((f) => ({
      id: f.id,
      descricao: f.descricao,
      valor: f.valor,
      dataRecebimento: f.dataRecebimento,
      formaPagamento: null,
    })),
  });
}

async function documentoJaUsado(
  empresaId: number,
  documento: string | null,
  ignorarId?: number,
): Promise<boolean> {
  if (documento === null) return false;
  const condicoes = [
    eq(cliente.empresaId, empresaId),
    eq(cliente.cpfCnpj, documento),
    isNotNull(cliente.cpfCnpj),
  ];
  if (ignorarId !== undefined) condicoes.push(ne(cliente.id, ignorarId));
  const [existente] = await db
    .select({ id: cliente.id })
    .from(cliente)
    .where(and(...condicoes))
    .limit(1);
  return existente !== undefined;
}

export async function criarCliente(
  contexto: Contexto,
  dados: ClientePayload,
): Promise<Result<{ id: number }>> {
  if (await documentoJaUsado(contexto.empresaId, dados.cpfCnpj)) {
    return falha(conflito('Este CPF/CNPJ já está cadastrado nesta empresa.', 'cpfCnpj'));
  }

  const [criado] = await db
    .insert(cliente)
    .values({ ...dados, empresaId: contexto.empresaId })
    .returning({ id: cliente.id });

  if (criado === undefined) return falha(naoEncontrado('Não foi possível cadastrar o cliente.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'CLIENTE_CRIADO',
    detalhes: `Cliente ${criado.id} — ${dados.nome}`,
  });

  return ok({ id: criado.id });
}

export async function atualizarCliente(
  contexto: Contexto,
  id: number,
  dados: ClientePayload,
): Promise<Result<{ id: number }>> {
  const [existente] = await db
    .select({ id: cliente.id })
    .from(cliente)
    .where(and(eq(cliente.id, id), eq(cliente.empresaId, contexto.empresaId)))
    .limit(1);

  if (existente === undefined) return falha(naoEncontrado('Cliente não encontrado.'));

  if (await documentoJaUsado(contexto.empresaId, dados.cpfCnpj, id)) {
    return falha(conflito('Este CPF/CNPJ já está cadastrado nesta empresa.', 'cpfCnpj'));
  }

  await db
    .update(cliente)
    .set(dados)
    .where(and(eq(cliente.id, id), eq(cliente.empresaId, contexto.empresaId)));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'CLIENTE_ATUALIZADO',
    detalhes: `Cliente ${id} — ${dados.nome}`,
  });

  return ok({ id });
}

export async function alternarClienteAtivo(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  const [atualizado] = await db
    .update(cliente)
    .set({ ativo })
    .where(and(eq(cliente.id, id), eq(cliente.empresaId, contexto.empresaId)))
    .returning({ id: cliente.id, ativo: cliente.ativo });

  if (atualizado === undefined) return falha(naoEncontrado('Cliente não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'CLIENTE_REATIVADO' : 'CLIENTE_ARQUIVADO',
    detalhes: `Cliente ${id}`,
  });

  return ok(atualizado);
}

// ---------------------------------------------------------------------------
// Veiculos
// ---------------------------------------------------------------------------

export async function listarVeiculos(
  contexto: Contexto,
  clienteId: number,
  incluirInativos: boolean,
): Promise<Result<Array<typeof veiculo.$inferSelect>>> {
  const condicoes = [eq(veiculo.empresaId, contexto.empresaId), eq(veiculo.clienteId, clienteId)];
  if (!incluirInativos) condicoes.push(eq(veiculo.ativo, true));

  const lista = await db
    .select()
    .from(veiculo)
    .where(and(...condicoes))
    .orderBy(desc(veiculo.ativo), veiculo.modelo);

  return ok(lista);
}

async function placaJaUsada(
  empresaId: number,
  placa: string,
  ignorarId?: number,
): Promise<boolean> {
  const condicoes = [eq(veiculo.empresaId, empresaId), eq(veiculo.placa, placa)];
  if (ignorarId !== undefined) condicoes.push(ne(veiculo.id, ignorarId));
  const [existente] = await db
    .select({ id: veiculo.id })
    .from(veiculo)
    .where(and(...condicoes))
    .limit(1);
  return existente !== undefined;
}

export async function criarVeiculo(
  contexto: Contexto,
  dados: VeiculoPayload,
): Promise<Result<{ id: number }>> {
  const [dono] = await db
    .select({ id: cliente.id, ativo: cliente.ativo })
    .from(cliente)
    .where(and(eq(cliente.id, dados.clienteId), eq(cliente.empresaId, contexto.empresaId)))
    .limit(1);

  if (dono === undefined) return falha(naoEncontrado('Cliente não encontrado.'));
  if (!dono.ativo) {
    return falha(conflito('Não é possível adicionar veículo a um cliente arquivado.'));
  }
  if (await placaJaUsada(contexto.empresaId, dados.placa)) {
    return falha(conflito('Esta placa já está cadastrada nesta empresa.', 'placa'));
  }

  const [criado] = await db
    .insert(veiculo)
    .values({ ...dados, empresaId: contexto.empresaId })
    .returning({ id: veiculo.id });

  if (criado === undefined) return falha(naoEncontrado('Não foi possível cadastrar o veículo.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'VEICULO_CRIADO',
    detalhes: `Veículo ${criado.id} — ${dados.placa}`,
  });

  return ok({ id: criado.id });
}

export async function atualizarVeiculo(
  contexto: Contexto,
  id: number,
  dados: VeiculoPayload,
): Promise<Result<{ id: number }>> {
  const [existente] = await db
    .select({ id: veiculo.id })
    .from(veiculo)
    .where(and(eq(veiculo.id, id), eq(veiculo.empresaId, contexto.empresaId)))
    .limit(1);

  if (existente === undefined) return falha(naoEncontrado('Veículo não encontrado.'));
  if (await placaJaUsada(contexto.empresaId, dados.placa, id)) {
    return falha(conflito('Esta placa já está cadastrada nesta empresa.', 'placa'));
  }

  const { clienteId: _clienteId, ...camposEditaveis } = dados;
  await db
    .update(veiculo)
    .set(camposEditaveis)
    .where(and(eq(veiculo.id, id), eq(veiculo.empresaId, contexto.empresaId)));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: 'VEICULO_ATUALIZADO',
    detalhes: `Veículo ${id} — ${dados.placa}`,
  });

  return ok({ id });
}

export async function alternarVeiculoAtivo(
  contexto: Contexto,
  id: number,
  ativo: boolean,
): Promise<Result<{ id: number; ativo: boolean }>> {
  if (ativo) {
    const [dono] = await db
      .select({ ativo: cliente.ativo })
      .from(veiculo)
      .innerJoin(cliente, eq(cliente.id, veiculo.clienteId))
      .where(and(eq(veiculo.id, id), eq(veiculo.empresaId, contexto.empresaId)))
      .limit(1);
    if (dono === undefined) return falha(naoEncontrado('Veículo não encontrado.'));
    if (!dono.ativo) {
      return falha(conflito('Reative o cliente antes de reativar o veículo.'));
    }
  }

  const [atualizado] = await db
    .update(veiculo)
    .set({ ativo })
    .where(and(eq(veiculo.id, id), eq(veiculo.empresaId, contexto.empresaId)))
    .returning({ id: veiculo.id, ativo: veiculo.ativo });

  if (atualizado === undefined) return falha(naoEncontrado('Veículo não encontrado.'));

  await registrar({
    empresaId: contexto.empresaId,
    usuarioId: contexto.usuario.usuarioId,
    acao: ativo ? 'VEICULO_REATIVADO' : 'VEICULO_ARQUIVADO',
    detalhes: `Veículo ${id}`,
  });

  return ok(atualizado);
}

/** Total de clientes por relacionamento, usado no painel. */
export async function contarPorRelacionamento(contexto: Contexto) {
  const registros = await db
    .select({
      clienteId: agendamento.clienteId,
      ultimo: max(agendamento.dataHora),
    })
    .from(agendamento)
    .where(and(eq(agendamento.empresaId, contexto.empresaId), eq(agendamento.status, 'CONCLUIDO')))
    .groupBy(agendamento.clienteId);

  const [{ total = 0 } = { total: 0 }] = await db
    .select({ total: count() })
    .from(cliente)
    .where(and(eq(cliente.empresaId, contexto.empresaId), eq(cliente.ativo, true)));

  const contagem: Record<Relacionamento, number> = {
    ATIVO: 0,
    EM_RISCO: 0,
    INATIVO: 0,
    SEM_ATENDIMENTO: 0,
  };

  for (const registro of registros) {
    const iso = registro.ultimo === null ? null : new Date(registro.ultimo).toISOString();
    contagem[classificarRelacionamento(iso)] += 1;
  }

  const comAtendimento = registros.length;
  contagem.SEM_ATENDIMENTO = Math.max(0, Number(total) - comAtendimento);
  return contagem;
}
