'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveRestore,
  Building2,
  CreditCard,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import { Botao } from '@/components/ui/botao';
import { Alternador, Campo, Selecao } from '@/components/ui/campo';
import { Cartao, CartaoCabecalho, CartaoCorpo } from '@/components/ui/cartao';
import { Dialogo } from '@/components/ui/dialogo';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Vazio } from '@/components/ui/vazio';
import { CATALOGO_PLANOS, ROTULO_PAPEL, ROTULO_STATUS_ASSINATURA } from '@/domain/plano';
import { formatarCpfCnpj, formatarTelefone } from '@/domain/shared/documento';
import { formatarData, formatarDataHora } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import {
  ACENTOS,
  CATALOGO_ACENTOS,
  MINUTOS_INATIVIDADE,
  type Acento,
  type ModoTema,
} from '@/domain/tema';
import { usePermissao, useSessao, type SessaoAtual } from '@/hooks/use-sessao';
import { aplicarTemaNoDocumento } from '@/lib/tema-cliente';
import { api, mensagemDeErro } from '@/lib/api';
import { chaves } from '@/lib/chaves';
import { cn } from '@/lib/utils';
import {
  dadosEmpresaSchema,
  formaPagamentoSchema,
  novoUsuarioSchema,
  type DadosEmpresaInput,
  type DadosEmpresaPayload,
  type FormaPagamentoInput,
  type NovoUsuarioInput,
} from '@/schemas';

interface RespostaConfiguracoes {
  empresa: {
    id: number;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    telefone: string | null;
    email: string | null;
    plano: 'BASICO' | 'COMPLETO';
    statusAssinatura: 'ATIVA' | 'EM_ATRASO' | 'BLOQUEADA' | 'CANCELADA';
    valorMensalidade: string;
    proximoVencimento: string;
  };
  preferencias: {
    acento: Acento;
    hex: string;
    modo: ModoTema;
    inatividadeAtiva: boolean;
    inatividadeMinutos: number;
    podePersonalizar: boolean;
  };
  usuarios: {
    usuarios: Array<{
      id: number;
      nome: string;
      email: string;
      papel: 'SUPER_ADMIN' | 'ADMINISTRADOR' | 'FUNCIONARIO';
      ativo: boolean;
      ultimoAcesso: string | null;
    }>;
    limite: number;
    ativos: number;
  };
  formasPagamento: Array<{ id: number; nome: string; ativo: boolean }>;
  categoriasProduto: Array<{ id: number; nome: string; ativo: boolean }>;
  categoriasServico: Array<{ id: number; nome: string; ativo: boolean }>;
  solicitacaoPendente: { id: number; criadoEm: string } | null;
  acessos: Array<{
    id: number;
    ocorridoEm: string;
    ip: string | null;
    navegador: string | null;
    sistemaOperacional: string | null;
    usuarioNome: string;
  }>;
}

export function CentralDeConfiguracoes() {
  const cache = useQueryClient();
  const { data: sessao } = useSessao();
  const { ehAdministrador } = usePermissao();

  const [usuarioAberto, setUsuarioAberto] = useState(false);
  const [empresaAberta, setEmpresaAberta] = useState(false);
  const [formaAberta, setFormaAberta] = useState(false);
  const [hexPersonalizado, setHexPersonalizado] = useState('#f59e0b');

  const { data, isLoading } = useQuery({
    queryKey: chaves.configuracoes,
    queryFn: async () => {
      const resposta = await api.get<RespostaConfiguracoes>('/configuracoes');
      return resposta.data;
    },
  });

  const invalidar = () => {
    void cache.invalidateQueries({ queryKey: chaves.configuracoes });
    void cache.invalidateQueries({ queryKey: chaves.sessao });
  };

  const salvarTema = useMutation({
    mutationFn: async (dados: { acento: Acento; hex?: string; modo: ModoTema }) => {
      const resposta = await api.put<RespostaConfiguracoes['preferencias']>(
        '/configuracoes/tema',
        dados,
      );
      return resposta.data;
    },
    onSuccess: (preferencias) => {
      aplicarTemaNoDocumento(preferencias);
      cache.setQueryData<RespostaConfiguracoes>(chaves.configuracoes, (atual) =>
        atual === undefined ? atual : { ...atual, preferencias },
      );
      cache.setQueryData<SessaoAtual>(chaves.sessao, (atual) =>
        atual === undefined ? atual : { ...atual, preferencias },
      );
      invalidar();
      toast.success('Tema atualizado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const salvarSessao = useMutation({
    mutationFn: async (dados: { inatividadeAtiva: boolean; minutos: number }) => {
      await api.put('/configuracoes/sessao', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Preferências de sessão salvas.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const criarUsuario = useMutation({
    mutationFn: async (dados: NovoUsuarioInput) => {
      await api.post('/configuracoes/usuarios', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Usuário criado.');
      setUsuarioAberto(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarUsuario = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/configuracoes/usuarios/${id}/situacao`, { ativo });
      return ativo;
    },
    onSuccess: (ativo) => {
      invalidar();
      toast.success(ativo ? 'Usuário reativado.' : 'Usuário arquivado.');
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const solicitarAlteracao = useMutation({
    mutationFn: async (dados: DadosEmpresaPayload) => {
      await api.post('/configuracoes/empresa', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Solicitação enviada à EsteticaFlow.');
      setEmpresaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const criarForma = useMutation({
    mutationFn: async (dados: FormaPagamentoInput) => {
      await api.post('/configuracoes/formas', dados);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Forma de pagamento criada.');
      setFormaAberta(false);
    },
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const alternarForma = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await api.patch(`/configuracoes/formas/${id}/situacao`, { ativo });
    },
    onSuccess: invalidar,
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  const formUsuario = useForm<NovoUsuarioInput>({
    resolver: zodResolver(novoUsuarioSchema),
    defaultValues: { nome: '', email: '', papel: 'FUNCIONARIO', senha: '' },
  });

  const formEmpresa = useForm<DadosEmpresaInput>({
    resolver: zodResolver(dadosEmpresaSchema),
    defaultValues: { razaoSocial: '', nomeFantasia: '', cnpj: '', telefone: '', email: '' },
  });

  const formForma = useForm<FormaPagamentoInput>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (!empresaAberta || data === undefined) return;
    formEmpresa.reset({
      razaoSocial: data.empresa.razaoSocial,
      nomeFantasia: data.empresa.nomeFantasia,
      cnpj: data.empresa.cnpj,
      telefone: data.empresa.telefone ?? '',
      email: data.empresa.email ?? '',
    });
  }, [empresaAberta, data, formEmpresa]);

  useEffect(() => {
    if (data?.preferencias.hex !== undefined) setHexPersonalizado(data.preferencias.hex);
  }, [data?.preferencias.hex]);

  if (isLoading || data === undefined) {
    return (
      <>
        <CabecalhoDePagina titulo="Configurações" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} className="h-64" />
          ))}
        </div>
      </>
    );
  }

  const plano = CATALOGO_PLANOS[data.empresa.plano];
  const modoAtual = data.preferencias.modo;

  return (
    <>
      <CabecalhoDePagina
        titulo="Configurações"
        descricao="Empresa, equipe, aparência e segurança da sessão."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* --------------------------- Empresa ---------------------------- */}
        <Cartao destaque>
          <CartaoCabecalho
            titulo="Dados da empresa"
            descricao="Alterações passam por conferência da EsteticaFlow"
            acao={
              ehAdministrador ? (
                <Botao
                  variante="suave"
                  tamanho="pequeno"
                  onClick={() => setEmpresaAberta(true)}
                  disabled={data.solicitacaoPendente !== null}
                >
                  <Pencil />
                  Solicitar alteração
                </Botao>
              ) : undefined
            }
          />
          <CartaoCorpo className="space-y-3.5 text-sm">
            {data.solicitacaoPendente !== null ? (
              <p className="rounded-lg border border-[var(--atencao)]/40 bg-[var(--atencao-fraco)] p-3 text-xs text-[var(--atencao)]">
                Já existe uma solicitação pendente enviada em{' '}
                {formatarData(data.solicitacaoPendente.criadoEm)}. Aguarde a análise.
              </p>
            ) : null}

            <div>
              <p className="rotulo-tecnico">Razão social</p>
              <p className="mt-0.5 text-[var(--tinta)]">{data.empresa.razaoSocial}</p>
            </div>
            <div>
              <p className="rotulo-tecnico">Nome fantasia</p>
              <p className="mt-0.5 text-[var(--tinta)]">{data.empresa.nomeFantasia}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="rotulo-tecnico">CNPJ</p>
                <p className="numerico mt-0.5 text-[var(--tinta)]">
                  {formatarCpfCnpj(data.empresa.cnpj)}
                </p>
              </div>
              <div>
                <p className="rotulo-tecnico">Telefone</p>
                <p className="numerico mt-0.5 text-[var(--tinta)]">
                  {data.empresa.telefone === null ? '—' : formatarTelefone(data.empresa.telefone)}
                </p>
              </div>
            </div>
            <div>
              <p className="rotulo-tecnico">E-mail</p>
              <p className="mt-0.5 break-all text-[var(--tinta)]">{data.empresa.email ?? '—'}</p>
            </div>
          </CartaoCorpo>
        </Cartao>

        {/* --------------------------- Assinatura ------------------------- */}
        <Cartao>
          <CartaoCabecalho titulo="Assinatura" descricao="Plano contratado e vencimento" />
          <CartaoCorpo className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="acento">Plano {plano.nome}</Etiqueta>
              <Etiqueta
                tom={
                  data.empresa.statusAssinatura === 'ATIVA'
                    ? 'positivo'
                    : data.empresa.statusAssinatura === 'EM_ATRASO'
                      ? 'atencao'
                      : 'critico'
                }
              >
                {ROTULO_STATUS_ASSINATURA[data.empresa.statusAssinatura]}
              </Etiqueta>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--tinta-suave)]">Mensalidade</dt>
                <dd className="numerico">{formatarMoeda(data.empresa.valorMensalidade)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--tinta-suave)]">Próximo vencimento</dt>
                <dd className="numerico">{formatarData(data.empresa.proximoVencimento)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--tinta-suave)]">Usuários ativos</dt>
                <dd className="numerico">
                  {data.usuarios.ativos} de {data.usuarios.limite}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-[var(--tinta-tenue)]">
              {plano.descricao} A troca de plano é feita pela EsteticaFlow e preserva todo o
              histórico.
            </p>
          </CartaoCorpo>
        </Cartao>

        {/* --------------------------- Aparência -------------------------- */}
        <Cartao>
          <CartaoCabecalho
            titulo="Aparência"
            descricao="O acento aparece nos dois modos com contraste garantido"
          />
          <CartaoCorpo className="space-y-5">
            <div>
              <p className="rotulo-tecnico mb-2">Modo de exibição</p>
              <div className="flex gap-2">
                {(['escuro', 'claro'] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    onClick={() => salvarTema.mutate({ acento: data.preferencias.acento, modo })}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      modoAtual === modo
                        ? 'border-[var(--acento-ativo)] bg-[var(--acento-fraco)] text-[var(--acento-ativo)]'
                        : 'border-[var(--borda)] bg-[var(--superficie-2)] text-[var(--tinta-suave)] hover:border-[var(--borda-forte)]',
                    )}
                  >
                    <Monitor className="size-4" aria-hidden />
                    {modo === 'escuro' ? 'Escuro' : 'Claro'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="rotulo-tecnico mb-2">Acento de instrumentação</p>
              {!data.preferencias.podePersonalizar ? (
                <p className="rounded-lg border border-[var(--borda)] bg-[var(--superficie-2)] p-3 text-xs text-[var(--tinta-suave)]">
                  A personalização de cor faz parte do plano Completo. O plano Básico usa o âmbar
                  padrão do sistema.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {ACENTOS.filter((acento) => acento !== 'personalizado').map((acento) => (
                      <button
                        key={acento}
                        type="button"
                        aria-label={CATALOGO_ACENTOS[acento].rotulo}
                        aria-pressed={data.preferencias.acento === acento}
                        onClick={() => salvarTema.mutate({ acento, modo: modoAtual })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors',
                          data.preferencias.acento === acento
                            ? 'border-[var(--acento-ativo)] bg-[var(--acento-fraco)]'
                            : 'border-[var(--borda)] hover:border-[var(--borda-forte)]',
                        )}
                      >
                        <span
                          className="size-6 rounded-full"
                          style={{ background: CATALOGO_ACENTOS[acento].hex }}
                        />
                        <span className="text-[10px] text-[var(--tinta-suave)]">
                          {CATALOGO_ACENTOS[acento].rotulo}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-end gap-2">
                    <Campo
                      rotulo="Cor personalizada"
                      type="color"
                      className="w-32 [&_input]:h-10 [&_input]:cursor-pointer [&_input]:p-1"
                      value={hexPersonalizado}
                      onChange={(evento) => setHexPersonalizado(evento.target.value)}
                    />
                    <Botao
                      variante="suave"
                      onClick={() =>
                        salvarTema.mutate({
                          acento: 'personalizado',
                          hex: hexPersonalizado,
                          modo: modoAtual,
                        })
                      }
                      carregando={salvarTema.isPending}
                    >
                      <Palette />
                      Aplicar
                    </Botao>
                  </div>
                </>
              )}
            </div>
          </CartaoCorpo>
        </Cartao>

        {/* --------------------------- Sessão ----------------------------- */}
        <Cartao>
          <CartaoCabecalho
            titulo="Segurança da sessão"
            descricao="Encerramento automático por inatividade"
          />
          <CartaoCorpo className="space-y-5">
            <Alternador
              marcado={data.preferencias.inatividadeAtiva}
              desabilitado={!ehAdministrador}
              rotulo="Encerrar sessão por inatividade"
              descricao="Protege o painel em recepções e balcões compartilhados."
              aoMudar={(valor) =>
                salvarSessao.mutate({
                  inatividadeAtiva: valor,
                  minutos: data.preferencias.inatividadeMinutos,
                })
              }
            />

            <Selecao
              rotulo="Tempo de inatividade"
              disabled={!ehAdministrador || !data.preferencias.inatividadeAtiva}
              value={data.preferencias.inatividadeMinutos}
              onChange={(evento) =>
                salvarSessao.mutate({
                  inatividadeAtiva: data.preferencias.inatividadeAtiva,
                  minutos: Number(evento.target.value),
                })
              }
            >
              {MINUTOS_INATIVIDADE.map((minutos) => (
                <option key={minutos} value={minutos}>
                  {minutos} minutos
                </option>
              ))}
            </Selecao>

            <div>
              <p className="rotulo-tecnico mb-2">Acessos recentes</p>
              {data.acessos.length === 0 ? (
                <p className="text-xs text-[var(--tinta-tenue)]">Nenhum acesso registrado.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {data.acessos.slice(0, 5).map((acesso) => (
                    <li key={acesso.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-[var(--tinta-suave)]">
                        {acesso.usuarioNome} · {acesso.navegador ?? '—'}
                      </span>
                      <span className="numerico shrink-0 text-[var(--tinta-tenue)]">
                        {formatarDataHora(acesso.ocorridoEm)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CartaoCorpo>
        </Cartao>

        {/* --------------------------- Equipe ----------------------------- */}
        {ehAdministrador ? (
          <Cartao className="lg:col-span-2">
            <CartaoCabecalho
              titulo="Equipe"
              descricao={`${data.usuarios.ativos} de ${data.usuarios.limite} usuários ativos no plano ${plano.nome}`}
              acao={
                sessao?.usuario.papel === 'ADMINISTRADOR' ? (
                  <Botao
                    variante="acento"
                    tamanho="pequeno"
                    onClick={() => setUsuarioAberto(true)}
                    disabled={data.usuarios.ativos >= data.usuarios.limite}
                  >
                    <UserPlus />
                    Novo usuário
                  </Botao>
                ) : undefined
              }
            />
            {data.usuarios.usuarios.length === 0 ? (
              <Vazio icone={Users} titulo="Nenhum usuário" />
            ) : (
              <ul className="divide-y divide-[var(--borda)]">
                {data.usuarios.usuarios.map((usuario) => (
                  <li key={usuario.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--acento-fraco)] text-sm font-semibold text-[var(--acento-ativo)]"
                    >
                      {usuario.nome.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--tinta)]">
                        {usuario.nome}
                      </p>
                      <p className="truncate text-xs text-[var(--tinta-tenue)]">{usuario.email}</p>
                    </div>
                    <Etiqueta tom={usuario.papel === 'SUPER_ADMIN' ? 'acento' : 'neutro'}>
                      {ROTULO_PAPEL[usuario.papel]}
                    </Etiqueta>
                    {!usuario.ativo ? <Etiqueta tom="neutro">Arquivado</Etiqueta> : null}
                    <span className="numerico hidden text-xs text-[var(--tinta-tenue)] sm:block">
                      {usuario.ultimoAcesso === null
                        ? 'Nunca acessou'
                        : formatarDataHora(usuario.ultimoAcesso)}
                    </span>
                    {usuario.papel !== 'SUPER_ADMIN' &&
                    sessao?.usuario.papel === 'ADMINISTRADOR' ? (
                      <Botao
                        variante="fantasma"
                        tamanho="iconePequeno"
                        aria-label={usuario.ativo ? 'Arquivar usuário' : 'Reativar usuário'}
                        onClick={() =>
                          alternarUsuario.mutate({ id: usuario.id, ativo: !usuario.ativo })
                        }
                      >
                        {usuario.ativo ? <ArchiveRestore /> : <RotateCcw />}
                      </Botao>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        ) : null}

        {/* --------------------------- Formas de pagamento ---------------- */}
        {sessao?.recursos.includes('FINANCEIRO') === true ? (
          <Cartao className="lg:col-span-2">
            <CartaoCabecalho
              titulo="Formas de pagamento"
              descricao="Usadas ao registrar o recebimento de um atendimento"
              acao={
                ehAdministrador ? (
                  <Botao variante="suave" tamanho="pequeno" onClick={() => setFormaAberta(true)}>
                    <Plus />
                    Nova forma
                  </Botao>
                ) : undefined
              }
            />
            {data.formasPagamento.length === 0 ? (
              <Vazio icone={CreditCard} titulo="Nenhuma forma cadastrada" />
            ) : (
              <CartaoCorpo className="flex flex-wrap gap-2">
                {data.formasPagamento.map((forma) => (
                  <span
                    key={forma.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                      forma.ativo
                        ? 'border-[var(--borda)] bg-[var(--superficie-2)] text-[var(--tinta)]'
                        : 'border-dashed border-[var(--borda)] text-[var(--tinta-tenue)]',
                    )}
                  >
                    {forma.nome}
                    {ehAdministrador ? (
                      <button
                        type="button"
                        aria-label={forma.ativo ? 'Arquivar forma' : 'Reativar forma'}
                        onClick={() => alternarForma.mutate({ id: forma.id, ativo: !forma.ativo })}
                        className="text-[var(--tinta-tenue)] transition-colors hover:text-[var(--tinta)]"
                      >
                        {forma.ativo ? (
                          <ArchiveRestore className="size-3.5" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                      </button>
                    ) : null}
                  </span>
                ))}
              </CartaoCorpo>
            )}
          </Cartao>
        ) : null}
      </div>

      {/* ------------------------------- Diálogos ------------------------- */}
      <Dialogo
        aberto={usuarioAberto}
        aoMudar={setUsuarioAberto}
        largura="estreita"
        titulo="Novo usuário"
        descricao="O e-mail precisa ser único em toda a plataforma."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setUsuarioAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={criarUsuario.isPending}
              onClick={() => void formUsuario.handleSubmit((dados) => criarUsuario.mutate(dados))()}
            >
              Criar usuário
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Campo
            rotulo="Nome"
            obrigatorio
            erro={formUsuario.formState.errors.nome?.message}
            {...formUsuario.register('nome')}
          />
          <Campo
            rotulo="E-mail"
            type="email"
            obrigatorio
            erro={formUsuario.formState.errors.email?.message}
            {...formUsuario.register('email')}
          />
          <Selecao
            rotulo="Perfil"
            obrigatorio
            ajuda="Funcionário não gerencia equipe nem configurações."
            erro={formUsuario.formState.errors.papel?.message}
            {...formUsuario.register('papel')}
          >
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </Selecao>
          <Campo
            rotulo="Senha inicial"
            type="password"
            obrigatorio
            ajuda="Mínimo de 8 caracteres."
            erro={formUsuario.formState.errors.senha?.message}
            {...formUsuario.register('senha')}
          />
        </form>
      </Dialogo>

      <Dialogo
        aberto={empresaAberta}
        aoMudar={setEmpresaAberta}
        titulo="Solicitar alteração cadastral"
        descricao="Como são dados fiscais, a EsteticaFlow confere antes de aplicar."
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setEmpresaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={solicitarAlteracao.isPending}
              onClick={() =>
                void formEmpresa.handleSubmit((dados) =>
                  solicitarAlteracao.mutate(dados as unknown as DadosEmpresaPayload),
                )()
              }
            >
              <Building2 />
              Enviar solicitação
            </Botao>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(evento) => evento.preventDefault()}>
          <Campo
            rotulo="Razão social"
            obrigatorio
            erro={formEmpresa.formState.errors.razaoSocial?.message}
            {...formEmpresa.register('razaoSocial')}
          />
          <Campo
            rotulo="Nome fantasia"
            obrigatorio
            erro={formEmpresa.formState.errors.nomeFantasia?.message}
            {...formEmpresa.register('nomeFantasia')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="CNPJ"
              obrigatorio
              inputMode="numeric"
              erro={formEmpresa.formState.errors.cnpj?.message}
              {...formEmpresa.register('cnpj')}
            />
            <Campo
              rotulo="Telefone"
              inputMode="tel"
              erro={formEmpresa.formState.errors.telefone?.message}
              {...formEmpresa.register('telefone')}
            />
          </div>
          <Campo
            rotulo="E-mail"
            type="email"
            erro={formEmpresa.formState.errors.email?.message}
            {...formEmpresa.register('email')}
          />
          <p className="flex items-start gap-2 rounded-lg border border-[var(--informativo)]/30 bg-[var(--informativo-fraco)] p-3 text-xs text-[var(--informativo)]">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Enquanto a solicitação estiver pendente, não é possível enviar outra.
          </p>
        </form>
      </Dialogo>

      <Dialogo
        aberto={formaAberta}
        aoMudar={setFormaAberta}
        largura="estreita"
        titulo="Nova forma de pagamento"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setFormaAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="acento"
              carregando={criarForma.isPending}
              onClick={() => void formForma.handleSubmit((dados) => criarForma.mutate(dados))()}
            >
              Criar
            </Botao>
          </>
        }
      >
        <Campo
          rotulo="Nome"
          obrigatorio
          placeholder="PIX, Cartão de crédito, Dinheiro..."
          erro={formForma.formState.errors.nome?.message}
          {...formForma.register('nome')}
        />
      </Dialogo>
    </>
  );
}
