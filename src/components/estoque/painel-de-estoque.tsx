'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveRestore,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AvisoDePlano, CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho } from '@/components/ui/cartao';
import { Dialogo } from '@/components/ui/dialogo';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Medidor } from '@/components/ui/indicador';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { UNIDADES, type NivelEstoque } from '@/domain/estoque';
import { formatarDataHora } from '@/domain/shared/tempo';
import { formatarMoeda, formatarQuantidade } from '@/domain/shared/texto';
import { usePermissao } from '@/hooks/use-sessao';
import { api, mensagemDeErro, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import {
  categoriaSchema,
  entradaEstoqueSchema,
  produtoSchema,
  saidaEstoqueSchema,
  type CategoriaInput,
  type EntradaEstoqueInput,
  type FiltroEstoque,
  type ProdutoInput,
  type ProdutoPayload,
  type SaidaEstoqueInput,
} from '@/schemas';
import type { ItemDeEstoque } from '@/server/estoque';

const TOM_NIVEL: Record<NivelEstoque, TomEtiqueta> = {
  CRITICO: 'critico',
  BAIXO: 'atencao',
  SAUDAVEL: 'positivo',
};

const ROTULO_NIVEL: Record<NivelEstoque, string> = {
  CRITICO: 'Zerado',
  BAIXO: 'Abaixo do mínimo',
  SAUDAVEL: 'Saudável',
};

interface Movimentacao {
  id: number;
  tipo: string;
  origem: string;
  quantidade: string;
  valorFinanceiro: string | null;
  motivo: string | null;
  ocorridoEm: string;
  produtoNome: string;
  unidadeMedida: string;
  usuarioNome: string | null;
}

const PRODUTO_VAZIO: ProdutoInput = {
  nome: '',
  categoriaProdutoId: 0,
  unidadeMedida: 'UN',
  quantidadeEmbalagem: '1',
  valorEmbalagem: '',
  quantidadeInicial: '0',
  quantidadeMinima: '0',
};

export function PainelDeEstoque() {
  const { permite, carregando } = usePermissao();
  const cache = useQueryClient();

  const [filtro, setFiltro] = useState<FiltroEstoque>({
    busca: '',
    situacao: 'ativos',
    somenteBaixo: false,
    ordenacao: 'nome',
  });
  const [produtoAberto, setProdutoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ItemDeEstoque | null>(null);
  const [movimentando, setMovimentando] = useState<{
    item: ItemDeEstoque;
    tipo: 'ENTRADA' | 'SAIDA';
  } | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState(false);

  const habilitado = permite('ESTOQUE');

  const { data: itens, isLoading } = useQuery({
    queryKey: chaves.estoque.lista(filtro),
    queryFn: async () => {
      const resposta = await api.get<ItemDeEstoque[]>('/estoque', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    enabled: habilitado,
    placeholderData: (anterior) => anterior,
  });

  const { data: categorias } = useQuery({
    queryKey: chaves.estoque.categorias(true),
    queryFn: async () => {
      const resposta = await api.get<
        Array<{ id: number; nome: string; ativo: boolean; totalProdutos: number }>
      >('/estoque/categorias', { params: { todos: true } });
      return resposta.data;
    },
    enabled: habilitado,
  });

  const { data: movimentacoes } = useQuery({
    queryKey: chaves.estoque.movimentacoes,
    queryFn: async () => {
      const resposta = await api.get<Movimentacao[]>('/estoque/movimentacoes');
      return resposta.data;
    },
    enabled: habilitado,
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.estoque.todos });
    void cache.invalidateQueries({ queryKey: chaves.financeiro.todos });
    void cache.invalidateQueries({ queryKey: chaves.painel });
  };

  const salvarProduto = useMutation({
    mutationFn: async ({ id, dados }: { id?: number; dados: ProdutoPayload }) => {
      if (id === undefined) await api.post('/estoque/produtos', dados);
      else await api.put(`/estoque/produtos/${id}`, dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Produto salvo.');
      setProdutoAberto(false);
      setEmEdicao(null);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarProduto = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/estoque/produtos/${id}/situacao`, { ativo });
      return ativo;
    },
    onSuccess: (ativo) => {
      invalidar();
      toast.success(ativo ? 'Produto reativado.' : 'Produto arquivado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const movimentar = useMutation({
    mutationFn: async ({
      id,
      tipo,
      dados,
    }: {
      id: number;
      tipo: 'ENTRADA' | 'SAIDA';
      dados: EntradaEstoqueInput | SaidaEstoqueInput;
    }) => {
      await api.post(`/estoque/produtos/${id}/${tipo === 'ENTRADA' ? 'entrada' : 'saida'}`, dados);
      return tipo;
    },
    onSuccess: (tipo) => {
      invalidar();
      toast.success(tipo === 'ENTRADA' ? 'Entrada registrada.' : 'Saída registrada.');
      setMovimentando(null);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const criarCategoria = useMutation({
    mutationFn: async (dados: CategoriaInput) => {
      await api.post('/estoque/categorias', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Categoria criada.');
      setCategoriaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const formProduto = useForm<ProdutoInput>({
    resolver: zodResolver(produtoSchema),
    defaultValues: PRODUTO_VAZIO,
  });

  const formEntrada = useForm<EntradaEstoqueInput>({
    resolver: zodResolver(entradaEstoqueSchema),
    defaultValues: { quantidade: '', valorPago: '', motivo: '' },
  });

  const formSaida = useForm<SaidaEstoqueInput>({
    resolver: zodResolver(saidaEstoqueSchema),
    defaultValues: { quantidade: '', motivo: '' },
  });

  const formCategoria = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (!produtoAberto) return;
    formProduto.reset(
      emEdicao === null
        ? { ...PRODUTO_VAZIO, categoriaProdutoId: categorias?.[0]?.id ?? 0 }
        : {
            nome: emEdicao.nome,
            categoriaProdutoId: emEdicao.categoriaId,
            unidadeMedida: emEdicao.unidadeMedida,
            quantidadeEmbalagem: emEdicao.quantidadeEmbalagem,
            valorEmbalagem: emEdicao.valorEmbalagem,
            quantidadeInicial: '0',
            quantidadeMinima: emEdicao.quantidadeMinima,
          },
    );
  }, [produtoAberto, emEdicao, categorias, formProduto]);

  useEffect(() => {
    if (movimentando === null) return;
    formEntrada.reset({ quantidade: '', valorPago: '', motivo: '' });
    formSaida.reset({ quantidade: '', motivo: '' });
  }, [movimentando, formEntrada, formSaida]);

  if (carregando) return <EsqueletoDeLista linhas={6} />;

  if (!habilitado) {
    return (
      <>
        <CabecalhoDePagina titulo="Estoque" />
        <AvisoDePlano recurso="O controle de estoque" />
      </>
    );
  }

  const valorTotal = (itens ?? []).reduce((soma, item) => soma + Number(item.valorEmEstoque), 0);
  const abaixoDoMinimo = (itens ?? []).filter((item) => item.nivel !== 'SAUDAVEL').length;

  return (
    <>
      <CabecalhoDePagina
        titulo="Estoque"
        descricao="Você cadastra o preço da embalagem fechada; o custo unitário é calculado."
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
                setProdutoAberto(true);
              }}
            >
              <Plus />
              Novo produto
            </Botao>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Itens cadastrados</span>
          <p className="numerico mt-1 text-2xl font-semibold">{itens?.length ?? 0}</p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Capital parado</span>
          <p className="numerico mt-1 text-2xl font-semibold text-[var(--acento-ativo)]">
            {formatarMoeda(valorTotal)}
          </p>
        </Cartao>
        <Cartao className="p-4">
          <span className="rotulo-tecnico">Abaixo do mínimo</span>
          <p
            className={
              abaixoDoMinimo > 0
                ? 'numerico mt-1 text-2xl font-semibold text-[var(--critico)]'
                : 'numerico mt-1 text-2xl font-semibold text-[var(--positivo)]'
            }
          >
            {abaixoDoMinimo}
          </p>
        </Cartao>
      </div>

      <Cartao className="mb-4">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            aria-label="Buscar produto"
            placeholder="Nome ou categoria"
            prefixo={<Search className="size-4" />}
            value={filtro.busca}
            onChange={(evento) => setFiltro((atual) => ({ ...atual, busca: evento.target.value }))}
          />
          <Selecao
            aria-label="Situação"
            value={filtro.situacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                situacao: evento.target.value as FiltroEstoque['situacao'],
              }))
            }
          >
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente arquivados</option>
            <option value="todos">Todos</option>
          </Selecao>
          <Selecao
            aria-label="Nível"
            value={filtro.somenteBaixo ? 'baixo' : 'todos'}
            onChange={(evento) =>
              setFiltro((atual) => ({ ...atual, somenteBaixo: evento.target.value === 'baixo' }))
            }
          >
            <option value="todos">Todos os níveis</option>
            <option value="baixo">Somente abaixo do mínimo</option>
          </Selecao>
          <Selecao
            aria-label="Ordenação"
            value={filtro.ordenacao}
            onChange={(evento) =>
              setFiltro((atual) => ({
                ...atual,
                ordenacao: evento.target.value as FiltroEstoque['ordenacao'],
              }))
            }
          >
            <option value="nome">Ordenar por nome</option>
            <option value="saldo_asc">Menor saldo</option>
            <option value="saldo_desc">Maior saldo</option>
            <option value="valor">Maior valor</option>
          </Selecao>
        </div>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Cartao>
          {isLoading ? (
            <div className="p-4">
              <EsqueletoDeLista />
            </div>
          ) : (itens?.length ?? 0) === 0 ? (
            <Vazio
              icone={Boxes}
              titulo="Nenhum produto no estoque"
              descricao="Cadastre os insumos que você usa para controlar saldo e custo."
              acao={
                <Botao
                  variante="acento"
                  onClick={() => {
                    setEmEdicao(null);
                    setProdutoAberto(true);
                  }}
                >
                  <Plus />
                  Cadastrar produto
                </Botao>
              }
            />
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <Coluna>Produto</Coluna>
                  <Coluna>Nível</Coluna>
                  <Coluna numerica>Saldo</Coluna>
                  <Coluna numerica>Mínimo</Coluna>
                  <Coluna numerica>Custo unit.</Coluna>
                  <Coluna numerica>Em estoque</Coluna>
                  <Coluna className="text-right">Ações</Coluna>
                </tr>
              </Cabecalho>
              <Corpo>
                {(itens ?? []).map((item) => (
                  <Linha key={item.produtoId}>
                    <Celula>
                      <p className="font-medium text-[var(--tinta)]">{item.nome}</p>
                      <p className="text-xs text-[var(--tinta-tenue)]">{item.categoriaNome}</p>
                      {!item.ativo ? (
                        <Etiqueta tom="neutro" className="mt-1">
                          Arquivado
                        </Etiqueta>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Etiqueta tom={TOM_NIVEL[item.nivel]}>{ROTULO_NIVEL[item.nivel]}</Etiqueta>
                      <div className="mt-1.5 w-24">
                        <Medidor
                          percentual={item.percentual}
                          tom={
                            item.nivel === 'SAUDAVEL'
                              ? 'positivo'
                              : item.nivel === 'BAIXO'
                                ? 'atencao'
                                : 'critico'
                          }
                          rotulo={`Nível de ${item.nome}`}
                        />
                      </div>
                    </Celula>
                    <Celula numerica>
                      {formatarQuantidade(item.quantidadeAtual)}{' '}
                      <span className="text-xs text-[var(--tinta-tenue)]">
                        {item.unidadeMedida}
                      </span>
                    </Celula>
                    <Celula numerica>{formatarQuantidade(item.quantidadeMinima)}</Celula>
                    <Celula numerica>{formatarMoeda(item.custoUnitario)}</Celula>
                    <Celula numerica>{formatarMoeda(item.valorEmEstoque)}</Celula>
                    <Celula className="text-right">
                      <div className="inline-flex gap-1">
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Entrada de ${item.nome}`}
                          onClick={() => setMovimentando({ item, tipo: 'ENTRADA' })}
                        >
                          <ArrowDownToLine />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Saída de ${item.nome}`}
                          onClick={() => setMovimentando({ item, tipo: 'SAIDA' })}
                        >
                          <ArrowUpFromLine />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={`Editar ${item.nome}`}
                          onClick={() => {
                            setEmEdicao(item);
                            setProdutoAberto(true);
                          }}
                        >
                          <Pencil />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={item.ativo ? 'Arquivar produto' : 'Reativar produto'}
                          onClick={() =>
                            alternarProduto.mutate({ id: item.produtoId, ativo: !item.ativo })
                          }
                        >
                          {item.ativo ? <ArchiveRestore /> : <RotateCcw />}
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
          <CartaoCabecalho titulo="Movimentações recentes" />
          {(movimentacoes?.length ?? 0) === 0 ? (
            <Vazio icone={History} titulo="Sem movimentações" />
          ) : (
            <ul className="max-h-[32rem] divide-y divide-[var(--borda)] overflow-y-auto">
              {(movimentacoes ?? []).map((movimentacao) => (
                <li key={movimentacao.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--tinta)]">
                        {movimentacao.produtoNome}
                      </p>
                      <p className="text-xs text-[var(--tinta-tenue)]">
                        {formatarDataHora(movimentacao.ocorridoEm)}
                        {movimentacao.usuarioNome !== null
                          ? ` · ${movimentacao.usuarioNome}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={
                        movimentacao.tipo === 'ENTRADA'
                          ? 'numerico shrink-0 text-sm text-[var(--positivo)]'
                          : 'numerico shrink-0 text-sm text-[var(--critico)]'
                      }
                    >
                      {movimentacao.tipo === 'ENTRADA' ? '+' : '−'}
                      {formatarQuantidade(movimentacao.quantidade)}
                    </span>
                  </div>
                  {movimentacao.motivo !== null ? (
                    <p className="mt-1 truncate text-xs text-[var(--tinta-suave)]">
                      {movimentacao.motivo}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {/* ------------------------------- Diálogos ------------------------- */}
      <Dialogo
        aberto={produtoAberto}
        aoMudar={(estado) => {
          if (!estado) {
            setProdutoAberto(false);
            setEmEdicao(null);
          }
        }}
        titulo={emEdicao === null ? 'Novo produto' : 'Editar produto'}
        descricao="Custo unitário = valor da embalagem ÷ quantidade da embalagem."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setProdutoAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={salvarProduto.isPending}
              onClick={() =>
                void formProduto.handleSubmit((dados) =>
                  salvarProduto.mutate({
                    ...(emEdicao === null ? {} : { id: emEdicao.produtoId }),
                    dados: dados as unknown as ProdutoPayload,
                  }),
                )()
              }
            >
              Salvar
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Campo
            rotulo="Nome"
            obrigatorio
            erro={formProduto.formState.errors.nome?.message}
            {...formProduto.register('nome')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Categoria"
              obrigatorio
              erro={formProduto.formState.errors.categoriaProdutoId?.message}
              {...formProduto.register('categoriaProdutoId')}
            >
              <option value={0}>Selecione</option>
              {(categorias ?? [])
                .filter((categoria) => categoria.ativo)
                .map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
            </Selecao>
            <Selecao
              rotulo="Unidade de medida"
              obrigatorio
              erro={formProduto.formState.errors.unidadeMedida?.message}
              {...formProduto.register('unidadeMedida')}
            >
              {UNIDADES.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </Selecao>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Conteúdo da embalagem"
              obrigatorio
              inputMode="decimal"
              ajuda="Ex.: 5000 para um galão de 5 litros em ML"
              erro={formProduto.formState.errors.quantidadeEmbalagem?.message}
              {...formProduto.register('quantidadeEmbalagem')}
            />
            <Campo
              rotulo="Valor da embalagem"
              obrigatorio
              inputMode="decimal"
              prefixo="R$"
              ajuda="Preço do galão inteiro, não da unidade"
              erro={formProduto.formState.errors.valorEmbalagem?.message}
              {...formProduto.register('valorEmbalagem')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {emEdicao === null ? (
              <Campo
                rotulo="Quantidade inicial"
                inputMode="decimal"
                ajuda="Gera entrada e despesa proporcional"
                erro={formProduto.formState.errors.quantidadeInicial?.message}
                {...formProduto.register('quantidadeInicial')}
              />
            ) : null}
            <Campo
              rotulo="Estoque mínimo"
              inputMode="decimal"
              ajuda="Abaixo disso, o sistema alerta"
              erro={formProduto.formState.errors.quantidadeMinima?.message}
              {...formProduto.register('quantidadeMinima')}
            />
          </div>
        </form>
      </Dialogo>

      <Dialogo
        aberto={movimentando !== null}
        aoMudar={(estado) => {
          if (!estado) setMovimentando(null);
        }}
        largura="estreita"
        titulo={
          movimentando?.tipo === 'ENTRADA' ? 'Entrada de estoque' : 'Saída de estoque'
        }
        descricao={
          movimentando === null
            ? undefined
            : `${movimentando.item.nome} · saldo atual ${formatarQuantidade(movimentando.item.quantidadeAtual)} ${movimentando.item.unidadeMedida}`
        }
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setMovimentando(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={movimentar.isPending}
              onClick={() => {
                if (movimentando === null) return;
                if (movimentando.tipo === 'ENTRADA') {
                  void formEntrada.handleSubmit((dados) =>
                    movimentar.mutate({
                      id: movimentando.item.produtoId,
                      tipo: 'ENTRADA',
                      dados,
                    }),
                  )();
                } else {
                  void formSaida.handleSubmit((dados) =>
                    movimentar.mutate({ id: movimentando.item.produtoId, tipo: 'SAIDA', dados }),
                  )();
                }
              }}
            >
              Registrar
            </Botao>
          </>
        }
      >
        {movimentando?.tipo === 'ENTRADA' ? (
          <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
            <Campo
              rotulo="Quantidade"
              obrigatorio
              inputMode="decimal"
              prefixo={movimentando.item.unidadeMedida}
              erro={formEntrada.formState.errors.quantidade?.message}
              {...formEntrada.register('quantidade')}
            />
            <Campo
              rotulo="Valor pago"
              inputMode="decimal"
              prefixo="R$"
              ajuda="Em branco, o sistema calcula proporcional à embalagem."
              erro={formEntrada.formState.errors.valorPago?.message}
              {...formEntrada.register('valorPago')}
            />
            <AreaDeTexto
              rotulo="Motivo"
              placeholder="Reposição de estoque"
              erro={formEntrada.formState.errors.motivo?.message}
              {...formEntrada.register('motivo')}
            />
            <p className="flex items-start gap-2 rounded-lg border border-[var(--informativo)]/30 bg-[var(--informativo-fraco)] p-3 text-xs text-[var(--informativo)]">
              <Package className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Toda entrada com valor gera uma despesa da categoria Fornecedor.
            </p>
          </form>
        ) : (
          <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
            <Campo
              rotulo="Quantidade"
              obrigatorio
              inputMode="decimal"
              prefixo={movimentando?.item.unidadeMedida}
              erro={formSaida.formState.errors.quantidade?.message}
              {...formSaida.register('quantidade')}
            />
            <AreaDeTexto
              rotulo="Motivo"
              placeholder="Perda, ajuste de inventário, uso interno..."
              erro={formSaida.formState.errors.motivo?.message}
              {...formSaida.register('motivo')}
            />
          </form>
        )}
      </Dialogo>

      <Dialogo
        aberto={categoriaAberta}
        aoMudar={setCategoriaAberta}
        largura="estreita"
        titulo="Nova categoria de produto"
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
          placeholder="Ceras e selantes, Panos, Químicos..."
          erro={formCategoria.formState.errors.nome?.message}
          {...formCategoria.register('nome')}
        />
      </Dialogo>
    </>
  );
}
