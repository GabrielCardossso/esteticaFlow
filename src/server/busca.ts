import { and, between, eq, ilike, or } from 'drizzle-orm';
import type { Contexto } from '@/auth/contexto';
import { db } from '@/db/client';
import { agendamento, cliente, estoque, produto, servico, veiculo } from '@/db/schema';
import { ok, type Result } from '@/domain/result';
import { fimDoDia, formatarDataHora, hojeISO, inicioDoDia, m } from '@/domain/shared/tempo';

export interface ResultadoDeBusca {
  grupo: string;
  itens: Array<{ titulo: string; subtitulo: string; url: string }>;
}

const LIMITE_POR_GRUPO = 5;
const MINIMO_CARACTERES = 2;

/**
 * Busca global. Cada grupo e independente: uma falha em um deles nao derruba
 * a busca inteira, mas e registrada no console em vez de silenciada.
 */
export async function buscar(
  contexto: Contexto,
  termoBruto: string,
): Promise<Result<{ termo: string; grupos: ResultadoDeBusca[] }>> {
  const termo = termoBruto.trim();
  if (termo.length < MINIMO_CARACTERES) return ok({ termo, grupos: [] });

  const padrao = `%${termo}%`;
  const digitos = termo.replace(/\D/g, '');
  const grupos: ResultadoDeBusca[] = [];

  const executar = async (nome: string, consulta: () => Promise<ResultadoDeBusca['itens']>) => {
    try {
      const itens = await consulta();
      if (itens.length > 0) grupos.push({ grupo: nome, itens });
    } catch (excecao) {
      console.error(`[esteticaflow] busca falhou no grupo "${nome}":`, excecao);
    }
  };

  await executar('Clientes', async () => {
    const registros = await db
      .select({
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        cidade: cliente.cidade,
      })
      .from(cliente)
      .where(
        and(
          eq(cliente.empresaId, contexto.empresaId),
          eq(cliente.ativo, true),
          or(
            ilike(cliente.nome, padrao),
            ilike(cliente.email, padrao),
            digitos === '' ? undefined : ilike(cliente.telefone, `%${digitos}%`),
            digitos === '' ? undefined : ilike(cliente.cpfCnpj, `%${digitos}%`),
          ),
        ),
      )
      .limit(LIMITE_POR_GRUPO);

    return registros.map((r) => ({
      titulo: r.nome,
      subtitulo: r.cidade ?? r.telefone,
      url: `/painel/clientes/${r.id}`,
    }));
  });

  await executar('Veículos', async () => {
    const registros = await db
      .select({
        id: veiculo.id,
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        clienteId: veiculo.clienteId,
        clienteNome: cliente.nome,
      })
      .from(veiculo)
      .innerJoin(cliente, eq(cliente.id, veiculo.clienteId))
      .where(
        and(
          eq(veiculo.empresaId, contexto.empresaId),
          eq(veiculo.ativo, true),
          or(
            ilike(veiculo.placa, padrao),
            ilike(veiculo.modelo, padrao),
            ilike(veiculo.marca, padrao),
          ),
        ),
      )
      .limit(LIMITE_POR_GRUPO);

    return registros.map((r) => ({
      titulo: `${r.marca} ${r.modelo}`,
      subtitulo: `${r.placa} · ${r.clienteNome}`,
      url: `/painel/clientes/${r.clienteId}`,
    }));
  });

  await executar('Agendamentos', async () => {
    const hoje = hojeISO();
    const registros = await db
      .select({
        id: agendamento.id,
        dataHora: agendamento.dataHora,
        status: agendamento.status,
        clienteNome: cliente.nome,
        placa: veiculo.placa,
      })
      .from(agendamento)
      .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
      .innerJoin(veiculo, eq(veiculo.id, agendamento.veiculoId))
      .where(
        and(
          eq(agendamento.empresaId, contexto.empresaId),
          between(
            agendamento.dataHora,
            inicioDoDia(m(hoje).subtract(30, 'days')),
            fimDoDia(m(hoje).add(60, 'days')),
          ),
          or(ilike(cliente.nome, padrao), ilike(veiculo.placa, padrao)),
        ),
      )
      .limit(LIMITE_POR_GRUPO);

    return registros.map((r) => ({
      titulo: `${r.clienteNome} · ${r.placa}`,
      subtitulo: formatarDataHora(r.dataHora),
      url: `/painel/agenda/${r.id}`,
    }));
  });

  await executar('Serviços', async () => {
    const registros = await db
      .select({ id: servico.id, nome: servico.nome, preco: servico.preco })
      .from(servico)
      .where(
        and(
          eq(servico.empresaId, contexto.empresaId),
          eq(servico.ativo, true),
          or(ilike(servico.nome, padrao), ilike(servico.descricao, padrao)),
        ),
      )
      .limit(LIMITE_POR_GRUPO);

    return registros.map((r) => ({
      titulo: r.nome,
      subtitulo: `R$ ${r.preco}`,
      url: `/painel/servicos?busca=${encodeURIComponent(termo)}`,
    }));
  });

  if (contexto.permite('ESTOQUE')) {
    await executar('Produtos', async () => {
      const registros = await db
        .select({
          id: produto.id,
          nome: produto.nome,
          saldo: estoque.quantidadeAtual,
          unidade: produto.unidadeMedida,
        })
        .from(produto)
        .innerJoin(estoque, eq(estoque.produtoId, produto.id))
        .where(
          and(
            eq(produto.empresaId, contexto.empresaId),
            eq(produto.ativo, true),
            ilike(produto.nome, padrao),
          ),
        )
        .limit(LIMITE_POR_GRUPO);

      return registros.map((r) => ({
        titulo: r.nome,
        subtitulo: `Saldo ${r.saldo} ${r.unidade}`,
        url: `/painel/estoque?busca=${encodeURIComponent(termo)}`,
      }));
    });
  }

  return ok({ termo, grupos });
}
