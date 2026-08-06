'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Clock, Pencil, Plus, RotateCcw, Search, Tag, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho } from '@/components/ui/cartao';
import { Dialogo } from '@/components/ui/dialogo';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { formatarDuracao } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { api, mensagemDeErro, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import {
  categoriaSchema,
  servicoSchema,
  type CategoriaInput,
  type FiltroServicos,
  type ServicoInput,
  type ServicoPayload,
} from '@/schemas';
import type { ServicoDaLista } from '@/server/servicos';

interface CategoriaDaLista {
  id: number;
  nome: string;
  ativo: boolean;
  totalServicos: number;
}

const SERVICO_VAZIO: ServicoInput = {
  nome: '',
  descricao: '',
  preco: '',
  tempoEstimadoMinutos: 60,
  categoriaServicoId: 0,
};

export function CatalogoDeServicos() {
  const cache = useQueryClient();
  const [filtro, setFiltro] = useState<FiltroServicos>({
    busca: '',
    situacao: 'ativos',
    ordenacao: 'nome',
  });
  const [servicoAberto, setServicoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ServicoDaLista | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState(false);

  const { data: servicos, isLoading } = useQuery({
    queryKey: chaves.servicos.lista(filtro),
    queryFn: async () => {
      const resposta = await api.get<ServicoDaLista[]>('/servicos', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    placeholderData: (anterior) => anterior,
  });

  const { data: categorias } = useQuery({
    queryKey: chaves.servicos.categorias(true),
    queryFn: async () => {
      const resposta = await api.get<CategoriaDaLista[]>('/servicos/categorias', {
        params: { todos: true },
      });
      return resposta.data;
    },
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.servicos.todos });
  };

  const salvarServico = useMutation({
    mutationFn: async ({ id, dados }: { id?: number; dados: ServicoPayload }) => {
      if (id === undefined) await api.post('/servicos', dados);
      else await api.put(`/servicos/${id}`, dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Serviço salvo.');
      setServicoAberto(false);
      setEmEdicao(null);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarServico = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/servicos/${id}/situacao`, { ativo });
      return ativo;
    },
    onSuccess: (ativo) => {
      invalidar();
      toast.success(ativo ? 'Serviço reativado.' : 'Serviço arquivado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const criarCategoria = useMutation({
    mutationFn: async (dados: CategoriaInput) => {
      await api.post('/servicos/categorias', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Categoria criada.');
      setCategoriaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarCategoria = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/servicos/categorias/${id}/situacao`, { ativo });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Categoria atualizada.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const formServico = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
    defaultValues: SERVICO_VAZIO,
  });

  const formCategoria = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (!servicoAberto) return;
    formServico.reset(
      emEdicao === null
        ? { ...SERVICO_VAZIO, categoriaServicoId: categorias?.[0]?.id ?? 0 }
        : {
            nome: emEdicao.nome,
            descricao: emEdicao.descricao ?? '',
            preco: emEdicao.preco,
            tempoEstimadoMinutos: emEdicao.tempoEstimadoMinutos,
            categoriaServicoId: emEdicao.categoriaId,
          },
    );
  }, [servicoAberto, emEdicao, categorias, formServico]);

  const enviarServico = formServico.handleSubmit((dados) => {
    salvarServico.mutate({
      ...(emEdicao === null ? {} : { id: emEdicao.id }),
      dados: dados as unknown as ServicoPayload,
    });
  });

  return (
    <>
      <CabecalhoDePagina
        titulo="Serviços"
        descricao="O preço e o tempo aqui definem o valor e a janela de agenda de cada atendimento."
        acao={
          <>
            <Botao variante="suave" onClick={() => setCategoriaAberta(true)}>
              <Tag />
              Nova categoria
            </Botao>
            <Botao
              variante="acento"
              onClick={() => {
                setEmEdicao(null);
                setServicoAberto(true);
              }}
            >
              <Plus />
              Novo serviço
            </Botao>
          </>
        }
      />

      <Cartao className="mb-4">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            aria-label="Buscar serviço"
            placeholder="Nome, descrição ou categoria"
            prefixo={<Search className="size-4" />}
            value={filtro.busca}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, busca: evento.target.value }))}
          />
          <Selecao
            aria-label="Categoria"
            value={filtro.categoriaId ?? ''}
            onChange={(evento) =>
              setFiltro((atual) => {
                const valor = evento.target.value;
                if (valor === '') {
                  const { categoriaId: _ignorado, ...resto } = atual;
                  return resto;
                }
                return { ...atual, categoriaId: Number(valor) };
              })
            }
          >
            <option value="">Todas as categorias</option>
            {(categorias ?? [])
              .filter((categoria) => categoria.ativo)
              .map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
          </Selecao>
          <Selecao
            aria-label="Situação"
            value={filtro.situacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                situacao: evento.target.value as FiltroServicos['situacao'],
              }))
            }
          >
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente arquivados</option>
            <option value="todos">Todos</option>
          </Selecao>
          <Selecao
            aria-label="Ordenação"
            value={filtro.ordenacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                ordenacao: evento.target.value as FiltroServicos['ordenacao'],
              }))
            }
          >
            <option value="nome">Ordenar por nome</option>
            <option value="preco_desc">Maior preço</option>
            <option value="preco_asc">Menor preço</option>
            <option value="duracao">Menor duração</option>
          </Selecao>
        </div>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Cartao>
          {isLoading ? (
            <div className="p-4">
              <EsqueletoDeLista />
            </div>
          ) : (servicos?.length ?? 0) === 0 ? (
            <Vazio
              icone={Wrench}
              titulo="Nenhum serviço cadastrado"
              descricao="Cadastre os serviços que você executa para poder montar atendimentos."
              acao={
                <Botao
                  variante="acento"
                  onClick={() => {
                    setEmEdicao(null);
                    setServicoAberto(true);
                  }}
                >
                  <Plus />
                  Cadastrar serviço
                </Botao>
              }
            />
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <Coluna>Serviço</Coluna>
                  <Coluna>Categoria</Coluna>
                  <Coluna numerica>Preço</Coluna>
                  <Coluna numerica>Duração</Coluna>
                  <Coluna numerica>Vendas</Coluna>
                  <Coluna className="text-right">Ações</Coluna>
                </tr>
              </Cabecalho>
              <Corpo>
                {(servicos ?? []).map((servico) => (
                  <Linha key={servico.id}>
                    <Celula>
                      <p className="font-medium text-[var(--tinta)]">{servico.nome}</p>
                      {servico.descricao !== null ? (
                        <p className="line-clamp-1 text-xs text-[var(--tinta-tenue)]">
                          {servico.descricao}
                        </p>
                      ) : null}
                      {!servico.ativo ? (
                        <Etiqueta tom="neutro" className="mt-1">
                          Arquivado
                        </Etiqueta>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Etiqueta tom="neutro">{servico.categoriaNome}</Etiqueta>
                    </Celula>
                    <Celula numerica>{formatarMoeda(servico.preco)}</Celula>
                    <Celula numerica>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 text-[var(--tinta-tenue)]" aria-hidden />
                        {formatarDuracao(servico.tempoEstimadoMinutos)}
                      </span>
                    </Celula>
                    <Celula numerica>{servico.vezesVendido}</Celula>
                    <Celula className="text-right">
                      <div className="inline-flex gap-1">
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Editar ${servico.nome}`}
                          onClick={() => {
                            setEmEdicao(servico);
                            setServicoAberto(true);
                          }}
                        >
                          <Pencil />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={servico.ativo ? 'Arquivar serviço' : 'Reativar serviço'}
                          onClick={() =>
                            alternarServico.mutate({ id: servico.id, ativo: !servico.ativo })
                          }
                        >
                          {servico.ativo ? <ArchiveRestore /> : <RotateCcw />}
                        </Botao>
                      </div>
                    </Celula>
                  </Linha>
                ))}
              </Corpo>
            </Tabela>
          )}
        </Cartao>

        <Cartao>
          <CartaoCabecalho titulo="Categorias" descricao="Organizam o catálogo e os relatórios" />
          {(categorias?.length ?? 0) === 0 ? (
            <Vazio icone={Tag} titulo="Nenhuma categoria" />
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {(categorias ?? []).map((categoria) => (
                <li key={categoria.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--tinta)]">{categoria.nome}</p>
                    <p className="text-xs text-[var(--tinta-tenue)]">
                      {categoria.totalServicos}{' '}
                      {categoria.totalServicos === 1 ? 'serviço' : 'serviços'}
                    </p>
                  </div>
                  {!categoria.ativo ? <Etiqueta tom="neutro">Arquivada</Etiqueta> : null}
                  <Botao
                    variante="fantasma"
                    tamanho="iconePequeno"
                    aria-label={categoria.ativo ? 'Arquivar categoria' : 'Reativar categoria'}
                    onClick={() =>
                      alternarCategoria.mutate({ id: categoria.id, ativo: !categoria.ativo })
                    }
                  >
                    {categoria.ativo ? <ArchiveRestore /> : <RotateCcw />}
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {/* ------------------------------- Diálogos ------------------------- */}
      <Dialogo
        aberto={servicoAberto}
        aoMudar={(estado) => {
          if (!estado) {
            setServicoAberto(false);
            setEmEdicao(null);
          }
        }}
        titulo={emEdicao === null ? 'Novo serviço' : 'Editar serviço'}
        descricao="A duração alimenta a reserva de janela na agenda."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setServicoAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              onClick={() => void enviarServico()}
              carregando={salvarServico.isPending}
            >
              Salvar
            </Botao>
          </>
        }
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviarServico();
          }}
        >
          <Campo
            rotulo="Nome"
            obrigatorio
            erro={formServico.formState.errors.nome?.message}
            {...formServico.register('nome')}
          />
          <AreaDeTexto
            rotulo="Descrição"
            placeholder="O que está incluso no serviço"
            erro={formServico.formState.errors.descricao?.message}
            {...formServico.register('descricao')}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Preço"
              obrigatorio
              inputMode="decimal"
              prefixo="R$"
              erro={formServico.formState.errors.preco?.message}
              {...formServico.register('preco')}
            />
            <Campo
              rotulo="Duração (min)"
              obrigatorio
              inputMode="numeric"
              erro={formServico.formState.errors.tempoEstimadoMinutos?.message}
              {...formServico.register('tempoEstimadoMinutos')}
            />
            <Selecao
              rotulo="Categoria"
              obrigatorio
              erro={formServico.formState.errors.categoriaServicoId?.message}
              {...formServico.register('categoriaServicoId')}
            >
              <option value={0}>Selecione</option>
              {(categorias ?? [])
                .filter((categoria) => categoria.ativo || categoria.id === emEdicao?.categoriaId)
                .map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
            </Selecao>
          </div>
        </form>
      </Dialogo>

      <Dialogo
        aberto={categoriaAberta}
        aoMudar={setCategoriaAberta}
        largura="estreita"
        titulo="Nova categoria de serviço"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setCategoriaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={criarCategoria.isPending}
              onClick={() =>
                void formCategoria.handleSubmit((dados) => criarCategoria.mutate(dados))()
              }
            >
              Criar
            </Botao>
          </>
        }
      >
        <Campo
          rotulo="Nome da categoria"
          obrigatorio
          placeholder="Polimento, Vitrificação, Higienização..."
          erro={formCategoria.formState.errors.nome?.message}
          {...formCategoria.register('nome')}
        />
      </Dialogo>
    </>
  );
}
