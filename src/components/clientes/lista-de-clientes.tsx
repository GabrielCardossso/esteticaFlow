'use client';

import {
  ArchiveRestore,
  Car,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import {
  FormularioDeCliente,
  type ValoresIniciaisCliente,
} from '@/components/clientes/formulario-de-cliente';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Campo, Selecao } from '@/components/ui/campo';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Cabecalho, Celula, Coluna, Corpo, Linha, LinhaVazia, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { CATALOGO_RELACIONAMENTO, type Relacionamento } from '@/domain/cliente';
import { formatarCpfCnpj, formatarTelefone } from '@/domain/shared/documento';
import { formatarData } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useAlternarCliente, useListaDeClientes } from '@/hooks/use-clientes';
import type { FiltroClientes } from '@/schemas';

const TOM_RELACIONAMENTO: Record<Relacionamento, TomEtiqueta> = {
  ATIVO: 'positivo',
  EM_RISCO: 'atencao',
  INATIVO: 'critico',
  SEM_ATENDIMENTO: 'neutro',
};

const FILTRO_INICIAL: FiltroClientes = {
  busca: '',
  situacao: 'ativos',
  relacionamento: 'todos',
  ordenacao: 'nome',
};

export function ListaDeClientes() {
  const [filtro, setFiltro] = useState<FiltroClientes>(FILTRO_INICIAL);
  const [buscaImediata, setBuscaImediata] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ValoresIniciaisCliente | undefined>(undefined);

  const { data, isLoading, isFetching } = useListaDeClientes(filtro);
  const alternar = useAlternarCliente();

  const totais = useMemo(() => {
    const lista = data ?? [];
    return {
      total: lista.length,
      receita: lista.reduce((soma, item) => soma + Number(item.valorTotalGasto), 0),
      emRisco: lista.filter(
        (item) => item.relacionamento === 'EM_RISCO' || item.relacionamento === 'INATIVO',
      ).length,
    };
  }, [data]);

  const aplicarBusca = (valor: string) => {
    setBuscaImediata(valor);
    setFiltro((atual) => ({ ...atual, busca: valor }));
  };

  return (
    <>
      <CabecalhoDePagina
        titulo="Clientes"
        descricao="Cadastro, histórico de atendimento e status de relacionamento."
        acao={
          <Botao
            variante="acento"
            onClick={() => {
              setEmEdicao(undefined);
              setFormAberto(true);
            }}
          >
            <UserPlus />
            Novo cliente
          </Botao>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Na listagem</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--tinta)]">{totais.total}</p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Receita acumulada</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--acento-ativo)]">
            {formatarMoeda(totais.receita)}
          </p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Precisam de contato</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--atencao)]">
            {totais.emRisco}
          </p>
        </Cartao>
      </div>

      <Cartao>
        <div className="grid gap-3 border-b border-[var(--borda)] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            aria-label="Buscar cliente"
            placeholder="Nome, telefone, documento ou cidade"
            value={buscaImediata}
            prefixo={<Search className="size-4" />}
            onChange={(evento) => aplicarBusca(evento.target.value)}
          />
          <Selecao
            aria-label="Situação"
            value={filtro.situacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                situacao: evento.target.value as FiltroClientes['situacao'],
              }))
            }
          >
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente arquivados</option>
            <option value="todos">Todos</option>
          </Selecao>
          <Selecao
            aria-label="Relacionamento"
            value={filtro.relacionamento}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                relacionamento: evento.target.value as FiltroClientes['relacionamento'],
              }))
            }
          >
            <option value="todos">Todo relacionamento</option>
            <option value="ATIVO">Ativos (até 30 dias)</option>
            <option value="EM_RISCO">Em risco (30 a 90 dias)</option>
            <option value="INATIVO">Inativos (mais de 90 dias)</option>
            <option value="SEM_ATENDIMENTO">Sem atendimento</option>
          </Selecao>
          <Selecao
            aria-label="Ordenação"
            value={filtro.ordenacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                ordenacao: evento.target.value as FiltroClientes['ordenacao'],
              }))
            }
          >
            <option value="nome">Ordenar por nome</option>
            <option value="ultimo_atendimento">Último atendimento</option>
            <option value="valor_gasto">Maior valor gasto</option>
            <option value="atendimentos">Mais atendimentos</option>
          </Selecao>
        </div>

        {isLoading ? (
          <div className="p-4">
            <EsqueletoDeLista />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <Vazio
            icone={Users}
            titulo={filtro.busca === '' ? 'Nenhum cliente cadastrado' : 'Nada encontrado'}
            descricao={
              filtro.busca === ''
                ? 'Cadastre o primeiro cliente para começar a montar o histórico da oficina.'
                : 'Ajuste a busca ou os filtros para encontrar o cliente.'
            }
            acao={
              filtro.busca === '' ? (
                <Botao
                  variante="acento"
                  onClick={() => {
                    setEmEdicao(undefined);
                    setFormAberto(true);
                  }}
                >
                  <Plus />
                  Cadastrar cliente
                </Botao>
              ) : undefined
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            <Tabela>
              <Cabecalho>
                <tr>
                  <Coluna>Cliente</Coluna>
                  <Coluna>Contato</Coluna>
                  <Coluna>Relacionamento</Coluna>
                  <Coluna numerica>Veículos</Coluna>
                  <Coluna numerica>Atendimentos</Coluna>
                  <Coluna numerica>Total gasto</Coluna>
                  <Coluna>Último</Coluna>
                  <Coluna className="text-right">Ações</Coluna>
                </tr>
              </Cabecalho>
              <Corpo>
                {(data ?? []).map((cliente) => (
                  <Linha key={cliente.id}>
                    <Celula>
                      <Link
                        href={`/painel/clientes/${cliente.id}`}
                        className="font-medium text-[var(--tinta)] underline-offset-4 hover:text-[var(--acento-ativo)] hover:underline"
                      >
                        {cliente.nome}
                      </Link>
                      <p className="text-xs text-[var(--tinta-tenue)]">
                        {cliente.cpfCnpj === null
                          ? 'Sem documento'
                          : formatarCpfCnpj(cliente.cpfCnpj)}
                        {cliente.cidade !== null ? ` · ${cliente.cidade}` : ''}
                      </p>
                      {!cliente.ativo ? (
                        <Etiqueta tom="neutro" className="mt-1">
                          Arquivado
                        </Etiqueta>
                      ) : null}
                    </Celula>
                    <Celula>
                      <span className="numerico text-sm">
                        {formatarTelefone(cliente.telefone)}
                      </span>
                      {cliente.whatsapp !== null ? (
                        <a
                          href={cliente.whatsapp}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ml-2 inline-flex text-[var(--positivo)] hover:opacity-80"
                          aria-label={`Abrir WhatsApp de ${cliente.nome}`}
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Etiqueta tom={TOM_RELACIONAMENTO[cliente.relacionamento]}>
                        {CATALOGO_RELACIONAMENTO[cliente.relacionamento].rotulo}
                      </Etiqueta>
                    </Celula>
                    <Celula numerica>{cliente.totalVeiculos}</Celula>
                    <Celula numerica>{cliente.totalAtendimentos}</Celula>
                    <Celula numerica>{formatarMoeda(cliente.valorTotalGasto)}</Celula>
                    <Celula>
                      <span className="text-sm text-[var(--tinta-suave)]">
                        {cliente.ultimoAtendimento === null
                          ? '—'
                          : formatarData(cliente.ultimoAtendimento)}
                      </span>
                    </Celula>
                    <Celula className="text-right">
                      <div className="inline-flex gap-1">
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Editar ${cliente.nome}`}
                          onClick={() =>
                            setEmEdicao({
                              id: cliente.id,
                              nome: cliente.nome,
                              cpfCnpj: cliente.cpfCnpj,
                              telefone: cliente.telefone,
                              email: cliente.email,
                              cep: null,
                              logradouro: null,
                              numero: null,
                              complemento: null,
                              bairro: null,
                              cidade: cliente.cidade,
                              uf: cliente.uf,
                              observacoes: null,
                            })
                          }
                        >
                          <Pencil />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={cliente.ativo ? 'Arquivar cliente' : 'Reativar cliente'}
                          onClick={() =>
                            alternar.mutate({ id: cliente.id, ativo: !cliente.ativo })
                          }
                        >
                          {cliente.ativo ? <ArchiveRestore /> : <RotateCcw />}
                        </Botao>
                        <Botao
                          comoFilho
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Ver ficha de ${cliente.nome}`}
                        >
                          <Link href={`/painel/clientes/${cliente.id}`}>
                            <Car />
                          </Link>
                        </Botao>
                      </div>
                    </Celula>
                  </Linha>
                ))}
                {(data ?? []).length === 0 ? (
                  <LinhaVazia colunas={8}>Nenhum cliente para os filtros atuais.</LinhaVazia>
                ) : null}
              </Corpo>
            </Tabela>
          </div>
        )}
      </Cartao>

      <FormularioDeCliente
        aberto={formAberto || emEdicao !== undefined}
        aoFechar={() => {
          setFormAberto(false);
          setEmEdicao(undefined);
        }}
        inicial={emEdicao}
      />
    </>
  );
}
