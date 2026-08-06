'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveRestore,
  Ban,
  Building2,
  Check,
  CreditCard,
  History,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Unlock,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho } from '@/components/ui/cartao';
import { Dialogo } from '@/components/ui/dialogo';
import { EsqueletoDeLista } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import {
  CATALOGO_PLANOS,
  PLANOS,
  ROTULO_STATUS_ASSINATURA,
  type StatusAssinatura,
} from '@/domain/plano';
import { formatarCpfCnpj } from '@/domain/shared/documento';
import { formatarData, formatarDataHora, hojeISO, m } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { api, mensagemDeErro, paramsLimpos } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import { ROTULO_ACAO_LOG } from '@/domain/auditoria';
import {
  assinaturaSchema,
  bloqueioSchema,
  novaEmpresaSchema,
  type AssinaturaInput,
  type AssinaturaPayload,
  type BloqueioInput,
  type FiltroEmpresas,
  type NovaEmpresaInput,
  type NovaEmpresaPayload,
} from '@/schemas';
import type { EmpresaDaLista } from '@/server/empresas';

const TOM_STATUS: Record<StatusAssinatura, TomEtiqueta> = {
  ATIVA: 'positivo',
  EM_ATRASO: 'atencao',
  BLOQUEADA: 'critico',
  CANCELADA: 'neutro',
};

interface SolicitacaoPendente {
  id: number;
  empresaId: number;
  empresaNome: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  criadoEm: string;
  diff: string;
}

interface RegistroDeLog {
  id: number;
  acao: string;
  detalhes: string | null;
  ocorridoEm: string;
  usuarioNome: string | null;
  empresaNome: string;
}

export function ConsoleDaPlataforma() {
  const cache = useQueryClient();
  const [aba, setAba] = useState<'empresas' | 'solicitacoes' | 'auditoria'>('empresas');
  const [filtro, setFiltro] = useState<FiltroEmpresas>({ busca: '', situacao: 'ativas' });
  const [novaAberta, setNovaAberta] = useState(false);
  const [assinaturaDe, setAssinaturaDe] = useState<EmpresaDaLista | null>(null);
  const [bloqueioDe, setBloqueioDe] = useState<EmpresaDaLista | null>(null);
  const [rejeitando, setRejeitando] = useState<SolicitacaoPendente | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const { data: empresas, isLoading } = useQuery({
    queryKey: chaves.plataforma.empresas(filtro),
    queryFn: async () => {
      const resposta = await api.get<EmpresaDaLista[]>('/plataforma/empresas', {
        params: paramsLimpos({ ...filtro }),
      });
      return resposta.data;
    },
    placeholderData: (anterior) => anterior,
  });

  const { data: solicitacoes } = useQuery({
    queryKey: chaves.plataforma.solicitacoes,
    queryFn: async () => {
      const resposta = await api.get<SolicitacaoPendente[]>('/plataforma/solicitacoes');
      return resposta.data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: chaves.plataforma.logs(null),
    queryFn: async () => {
      const resposta = await api.get<RegistroDeLog[]>('/plataforma/logs');
      return resposta.data;
    },
    enabled: aba === 'auditoria',
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.plataforma.todos });
    void cache.invalidateQueries({ queryKey: chaves.notificacoes });
  };

  const criarEmpresa = useMutation({
    mutationFn: async (dados: NovaEmpresaPayload) => {
      await api.post('/plataforma/empresas', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Empresa criada com administrador inicial.');
      setNovaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const atualizarAssinatura = useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: AssinaturaPayload }) => {
      await api.put(`/plataforma/empresas/${id}/assinatura`, dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Assinatura atualizada.');
      setAssinaturaDe(null);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const registrarPagamento = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/plataforma/empresas/${id}/pagamento`);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Pagamento registrado. Vencimento avançou um mês.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const bloquear = useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: BloqueioInput }) => {
      await api.post(`/plataforma/empresas/${id}/bloqueio`, dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Empresa bloqueada.');
      setBloqueioDe(null);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const desbloquear = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/plataforma/empresas/${id}/desbloqueio`);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Empresa desbloqueada.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarEmpresa = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/plataforma/empresas/${id}/situacao`, { ativo });
      return ativo;
    },
    onSuccess: (ativo) => {
      invalidar();
      toast.success(ativo ? 'Empresa reativada.' : 'Empresa arquivada.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const decidir = useMutation({
    mutationFn: async ({
      id,
      aprovar,
      motivo,
    }: {
      id: number;
      aprovar: boolean;
      motivo?: string | undefined;
    }) => {
      await api.post(`/plataforma/solicitacoes/${id}`, { aprovar, motivo });
      return aprovar;
    },
    onSuccess: (aprovar) => {
      invalidar();
      toast.success(aprovar ? 'Solicitação aprovada.' : 'Solicitação rejeitada.');
      setRejeitando(null);
      setMotivoRejeicao('');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const formNova = useForm<NovaEmpresaInput>({
    resolver: zodResolver(novaEmpresaSchema),
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      telefone: '',
      email: '',
      plano: 'BASICO',
      valorMensalidade: '',
      proximoVencimento: m().add(1, 'month').format('YYYY-MM-DD'),
      adminNome: '',
      adminEmail: '',
      adminSenha: '',
    },
  });

  const formAssinatura = useForm<AssinaturaInput>({
    resolver: zodResolver(assinaturaSchema),
    defaultValues: { plano: 'BASICO', valorMensalidade: '', proximoVencimento: hojeISO() },
  });

  const formBloqueio = useForm<BloqueioInput>({
    resolver: zodResolver(bloqueioSchema),
    defaultValues: { motivo: '', manual: false },
  });

  useEffect(() => {
    if (assinaturaDe === null) return;
    formAssinatura.reset({
      plano: assinaturaDe.plano,
      valorMensalidade: assinaturaDe.valorMensalidade,
      proximoVencimento: assinaturaDe.proximoVencimento,
    });
  }, [assinaturaDe, formAssinatura]);

  useEffect(() => {
    if (bloqueioDe === null) return;
    formBloqueio.reset({ motivo: '', manual: !bloqueioDe.elegivelBloqueio });
  }, [bloqueioDe, formBloqueio]);

  const pendentes = solicitacoes?.length ?? 0;

  return (
    <>
      <CabecalhoDePagina
        titulo="Plataforma"
        descricao="Gestão das empresas assinantes, assinaturas e auditoria."
        acao={
          <Botao variante="acento" onClick={() => setNovaAberta(true)}>
            <Plus />
            Nova empresa
          </Botao>
        }
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-1)] p-1">
        {(
          [
            ['empresas', 'Empresas', Building2],
            ['solicitacoes', `Solicitações${pendentes > 0 ? ` (${pendentes})` : ''}`, ShieldAlert],
            ['auditoria', 'Auditoria', History],
          ] as const
        ).map(([chave, rotulo, Icone]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            className={
              aba === chave
                ? 'flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--acento-fraco)] px-3 py-2 text-sm font-medium text-[var(--acento-ativo)]'
                : 'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--tinta-suave)] transition-colors hover:text-[var(--tinta)]'
            }
          >
            <Icone className="size-4" aria-hidden />
            {rotulo}
          </button>
        ))}
      </div>

      {/* ------------------------------- Empresas ------------------------- */}
      {aba === 'empresas' ? (
        <Cartao>
          <div className="grid gap-3 border-b border-[var(--borda)] p-4 sm:grid-cols-3">
            <Campo
              aria-label="Buscar empresa"
              placeholder="Nome fantasia, razão social ou CNPJ"
              prefixo={<Search className="size-4" />}
              value={filtro.busca}
              onChange={(evento) => setFiltro((atual) => ({ ...atual, busca: evento.target.value }))}
            />
            <Selecao
              aria-label="Plano"
              value={filtro.plano ?? ''}
              onChange={(evento) =>
                setFiltro((atual) => {
                  const valor = evento.target.value;
                  if (valor === '') {
                    const { plano: _ignorado, ...resto } = atual;
                    return resto;
                  }
                  return { ...atual, plano: valor as FiltroEmpresas['plano'] };
                })
              }
            >
              <option value="">Todos os planos</option>
              {PLANOS.map((plano) => (
                <option key={plano} value={plano}>
                  {CATALOGO_PLANOS[plano].nome}
                </option>
              ))}
            </Selecao>
            <Selecao
              aria-label="Situação"
              value={filtro.situacao}
              onChange={(evento) =>
                setFiltro((atual) => ({
                  ...atual,
                  situacao: evento.target.value as FiltroEmpresas['situacao'],
                }))
              }
            >
              <option value="ativas">Somente ativas</option>
              <option value="inativas">Somente arquivadas</option>
              <option value="todas">Todas</option>
            </Selecao>
          </div>

          {isLoading ? (
            <div className="p-4">
              <EsqueletoDeLista />
            </div>
          ) : (empresas?.length ?? 0) === 0 ? (
            <Vazio icone={Building2} titulo="Nenhuma empresa encontrada" />
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <Coluna>Empresa</Coluna>
                  <Coluna>Plano</Coluna>
                  <Coluna>Assinatura</Coluna>
                  <Coluna numerica>Mensalidade</Coluna>
                  <Coluna>Vencimento</Coluna>
                  <Coluna numerica>Usuários</Coluna>
                  <Coluna className="text-right">Ações</Coluna>
                </tr>
              </Cabecalho>
              <Corpo>
                {(empresas ?? []).map((empresa) => (
                  <Linha key={empresa.id}>
                    <Celula>
                      <p className="font-medium text-[var(--tinta)]">{empresa.nomeFantasia}</p>
                      <p className="numerico text-xs text-[var(--tinta-tenue)]">
                        {formatarCpfCnpj(empresa.cnpj)}
                      </p>
                      {!empresa.ativo ? (
                        <Etiqueta tom="neutro" className="mt-1">
                          Arquivada
                        </Etiqueta>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Etiqueta tom={empresa.plano === 'COMPLETO' ? 'acento' : 'neutro'}>
                        {CATALOGO_PLANOS[empresa.plano].nome}
                      </Etiqueta>
                    </Celula>
                    <Celula>
                      <Etiqueta tom={TOM_STATUS[empresa.statusAssinatura]}>
                        {ROTULO_STATUS_ASSINATURA[empresa.statusAssinatura]}
                      </Etiqueta>
                      {empresa.diasEmAtraso > 0 ? (
                        <p className="mt-1 text-xs text-[var(--atencao)]">
                          {empresa.diasEmAtraso} {empresa.diasEmAtraso === 1 ? 'dia' : 'dias'} de
                          atraso
                        </p>
                      ) : null}
                    </Celula>
                    <Celula numerica>{formatarMoeda(empresa.valorMensalidade)}</Celula>
                    <Celula>{formatarData(empresa.proximoVencimento)}</Celula>
                    <Celula numerica>{empresa.totalUsuarios}</Celula>
                    <Celula className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label="Registrar pagamento"
                          onClick={() => registrarPagamento.mutate(empresa.id)}
                        >
                          <CreditCard />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label="Editar assinatura"
                          onClick={() => setAssinaturaDe(empresa)}
                        >
                          <Building2 />
                        </Botao>
                        {empresa.statusAssinatura === 'BLOQUEADA' ? (
                          <Botao
                            variante="fantasma"
                            tamanho="iconePequeno"
                            aria-label="Desbloquear"
                            onClick={() => desbloquear.mutate(empresa.id)}
                          >
                            <Unlock />
                          </Botao>
                        ) : (
                          <Botao
                            variante="fantasma"
                            tamanho="iconePequeno"
                            aria-label="Bloquear"
                            onClick={() => setBloqueioDe(empresa)}
                          >
                            <Lock />
                          </Botao>
                        )}
                        <Botao
                          variante="fantasma"
                          tamanho="iconePequeno"
                          aria-label={empresa.ativo ? 'Arquivar empresa' : 'Reativar empresa'}
                          onClick={() =>
                            alternarEmpresa.mutate({ id: empresa.id, ativo: !empresa.ativo })
                          }
                        >
                          {empresa.ativo ? <ArchiveRestore /> : <RotateCcw />}
                        </Botao>
                      </div>
                    </Celula>
                  </Linha>
                ))}
              </Corpo>
            </Tabela>
          )}
        </Cartao>
      ) : null}

      {/* ------------------------------- Solicitações --------------------- */}
      {aba === 'solicitacoes' ? (
        <Cartao>
          <CartaoCabecalho
            titulo="Alterações cadastrais pendentes"
            descricao="Confira o que muda antes de aplicar nos dados fiscais"
          />
          {(solicitacoes?.length ?? 0) === 0 ? (
            <Vazio icone={ShieldAlert} titulo="Nenhuma solicitação pendente" />
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {(solicitacoes ?? []).map((solicitacao) => (
                <li key={solicitacao.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--tinta)]">{solicitacao.empresaNome}</p>
                      <p className="text-xs text-[var(--tinta-tenue)]">
                        Enviada em {formatarDataHora(solicitacao.criadoEm)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Botao
                        variante="critico"
                        tamanho="pequeno"
                        onClick={() => setRejeitando(solicitacao)}
                      >
                        <X />
                        Rejeitar
                      </Botao>
                      <Botao
                        variante="acento"
                        tamanho="pequeno"
                        carregando={decidir.isPending}
                        onClick={() => decidir.mutate({ id: solicitacao.id, aprovar: true })}
                      >
                        <Check />
                        Aprovar
                      </Botao>
                    </div>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] p-3 font-[family-name:var(--font-sans)] text-xs text-[var(--tinta-suave)]">
                    {solicitacao.diff}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      ) : null}

      {/* ------------------------------- Auditoria ------------------------ */}
      {aba === 'auditoria' ? (
        <Cartao>
          <CartaoCabecalho
            titulo="Trilha de auditoria"
            descricao="Últimos 200 eventos registrados em todas as empresas"
          />
          {(logs?.length ?? 0) === 0 ? (
            <Vazio icone={History} titulo="Nenhum evento registrado" />
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <Coluna>Quando</Coluna>
                  <Coluna>Empresa</Coluna>
                  <Coluna>Usuário</Coluna>
                  <Coluna>Ação</Coluna>
                  <Coluna>Detalhes</Coluna>
                </tr>
              </Cabecalho>
              <Corpo>
                {(logs ?? []).map((registro) => (
                  <Linha key={registro.id}>
                    <Celula>{formatarDataHora(registro.ocorridoEm)}</Celula>
                    <Celula>{registro.empresaNome}</Celula>
                    <Celula>{registro.usuarioNome ?? '—'}</Celula>
                    <Celula>
                      <Etiqueta tom="neutro">
                        {ROTULO_ACAO_LOG[registro.acao] ?? registro.acao}
                      </Etiqueta>
                    </Celula>
                    <Celula>
                      <span className="line-clamp-1 text-xs text-[var(--tinta-suave)]">
                        {registro.detalhes ?? '—'}
                      </span>
                    </Celula>
                  </Linha>
                ))}
              </Corpo>
            </Tabela>
          )}
        </Cartao>
      ) : null}

      {/* ------------------------------- Diálogos ------------------------- */}
      <Dialogo
        aberto={novaAberta}
        aoMudar={setNovaAberta}
        titulo="Nova empresa"
        descricao="Cria a empresa, o administrador inicial e os catálogos básicos de operação."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setNovaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={criarEmpresa.isPending}
              onClick={() =>
                void formNova.handleSubmit((dados) =>
                  criarEmpresa.mutate(dados as unknown as NovaEmpresaPayload),
                )()
              }
            >
              Criar empresa
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-5" onSubmit={(evento) => evento.preventDefault()}>
          <fieldset className="space-y-4">
            <legend className="rotulo-tecnico mb-2">Empresa</legend>
            <Campo
              rotulo="Razão social"
              obrigatorio
              erro={formNova.formState.errors.razaoSocial?.message}
              {...formNova.register('razaoSocial')}
            />
            <Campo
              rotulo="Nome fantasia"
              obrigatorio
              erro={formNova.formState.errors.nomeFantasia?.message}
              {...formNova.register('nomeFantasia')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="CNPJ"
                obrigatorio
                inputMode="numeric"
                erro={formNova.formState.errors.cnpj?.message}
                {...formNova.register('cnpj')}
              />
              <Campo
                rotulo="Telefone"
                inputMode="tel"
                erro={formNova.formState.errors.telefone?.message}
                {...formNova.register('telefone')}
              />
            </div>
            <Campo
              rotulo="E-mail"
              type="email"
              erro={formNova.formState.errors.email?.message}
              {...formNova.register('email')}
            />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="rotulo-tecnico mb-2">Assinatura</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Selecao
                rotulo="Plano"
                obrigatorio
                erro={formNova.formState.errors.plano?.message}
                {...formNova.register('plano')}
              >
                {PLANOS.map((plano) => (
                  <option key={plano} value={plano}>
                    {CATALOGO_PLANOS[plano].nome}
                  </option>
                ))}
              </Selecao>
              <Campo
                rotulo="Mensalidade"
                inputMode="decimal"
                prefixo="R$"
                ajuda="Em branco usa o padrão"
                erro={formNova.formState.errors.valorMensalidade?.message}
                {...formNova.register('valorMensalidade')}
              />
              <Campo
                rotulo="Vencimento"
                type="date"
                obrigatorio
                erro={formNova.formState.errors.proximoVencimento?.message}
                {...formNova.register('proximoVencimento')}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="rotulo-tecnico mb-2">Administrador inicial</legend>
            <Campo
              rotulo="Nome"
              obrigatorio
              erro={formNova.formState.errors.adminNome?.message}
              {...formNova.register('adminNome')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="E-mail"
                type="email"
                obrigatorio
                erro={formNova.formState.errors.adminEmail?.message}
                {...formNova.register('adminEmail')}
              />
              <Campo
                rotulo="Senha inicial"
                type="password"
                obrigatorio
                erro={formNova.formState.errors.adminSenha?.message}
                {...formNova.register('adminSenha')}
              />
            </div>
          </fieldset>
        </form>
      </Dialogo>

      <Dialogo
        aberto={assinaturaDe !== null}
        aoMudar={(estado) => {
          if (!estado) setAssinaturaDe(null);
        }}
        largura="estreita"
        titulo="Editar assinatura"
        descricao={assinaturaDe?.nomeFantasia}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setAssinaturaDe(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={atualizarAssinatura.isPending}
              onClick={() => {
                if (assinaturaDe === null) return;
                void formAssinatura.handleSubmit((dados) =>
                  atualizarAssinatura.mutate({
                    id: assinaturaDe.id,
                    dados: dados as unknown as AssinaturaPayload,
                  }),
                )();
              }}
            >
              Salvar
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Selecao rotulo="Plano" obrigatorio {...formAssinatura.register('plano')}>
            {PLANOS.map((plano) => (
              <option key={plano} value={plano}>
                {CATALOGO_PLANOS[plano].nome} · {formatarMoeda(CATALOGO_PLANOS[plano].valorMensalPadrao)}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Mensalidade"
            obrigatorio
            inputMode="decimal"
            prefixo="R$"
            erro={formAssinatura.formState.errors.valorMensalidade?.message}
            {...formAssinatura.register('valorMensalidade')}
          />
          <Campo
            rotulo="Próximo vencimento"
            type="date"
            obrigatorio
            erro={formAssinatura.formState.errors.proximoVencimento?.message}
            {...formAssinatura.register('proximoVencimento')}
          />
        </form>
      </Dialogo>

      <Dialogo
        aberto={bloqueioDe !== null}
        aoMudar={(estado) => {
          if (!estado) setBloqueioDe(null);
        }}
        largura="estreita"
        titulo="Bloquear acesso"
        descricao={
          bloqueioDe === null
            ? undefined
            : bloqueioDe.elegivelBloqueio
              ? `${bloqueioDe.nomeFantasia} está com ${bloqueioDe.diasEmAtraso} dias de atraso.`
              : `${bloqueioDe.nomeFantasia} ainda está na tolerância de 7 dias — exige bloqueio manual.`
        }
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setBloqueioDe(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="critico"
              carregando={bloquear.isPending}
              onClick={() => {
                if (bloqueioDe === null) return;
                void formBloqueio.handleSubmit((dados) =>
                  bloquear.mutate({ id: bloqueioDe.id, dados }),
                )();
              }}
            >
              <Ban />
              Bloquear
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <AreaDeTexto
            rotulo="Motivo do bloqueio"
            obrigatorio
            placeholder="Fica registrado na auditoria e visível para a empresa."
            erro={formBloqueio.formState.errors.motivo?.message}
            {...formBloqueio.register('motivo')}
          />
          <label className="flex items-center gap-2.5 text-sm text-[var(--tinta-suave)]">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--borda-forte)] accent-[var(--acento-ativo)]"
              {...formBloqueio.register('manual')}
            />
            Bloqueio manual (ignora a tolerância de 7 dias)
          </label>
        </form>
      </Dialogo>

      <Dialogo
        aberto={rejeitando !== null}
        aoMudar={(estado) => {
          if (!estado) setRejeitando(null);
        }}
        largura="estreita"
        titulo="Rejeitar solicitação"
        descricao={rejeitando?.empresaNome}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setRejeitando(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="critico"
              carregando={decidir.isPending}
              onClick={() => {
                if (rejeitando === null) return;
                decidir.mutate({
                  id: rejeitando.id,
                  aprovar: false,
                  motivo: motivoRejeicao === '' ? undefined : motivoRejeicao,
                });
              }}
            >
              Rejeitar
            </Botao>
          </>
        }
      >
        <AreaDeTexto
          rotulo="Motivo"
          placeholder="Explique o que impede a aprovação. A empresa recebe esta mensagem."
          value={motivoRejeicao}
          onChange={(evento) => setMotivoRejeicao(evento.target.value)}
        />
      </Dialogo>
    </>
  );
}
