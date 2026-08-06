'use client';

import {
  AlertTriangle,
  ArchiveRestore,
  ArrowLeft,
  Car,
  CalendarPlus,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CabecalhoDePagina } from '@/components/painel/cabecalho-de-pagina';
import {
  FormularioDeCliente,
  type ValoresIniciaisCliente,
} from '@/components/clientes/formulario-de-cliente';
import { FormularioDeVeiculo } from '@/components/clientes/formulario-de-veiculo';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo } from '@/components/ui/cartao';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Etiqueta, type TomEtiqueta } from '@/components/ui/etiqueta';
import { Indicador } from '@/components/ui/indicador';
import { Cabecalho, Celula, Coluna, Corpo, Linha, Tabela } from '@/components/ui/tabela';
import { Vazio } from '@/components/ui/vazio';
import { ROTULO_STATUS, type StatusAgendamento } from '@/domain/agendamento';
import { CATALOGO_RELACIONAMENTO, type Relacionamento } from '@/domain/cliente';
import { formatarCep, formatarCpfCnpj, formatarPlaca, formatarTelefone } from '@/domain/shared/documento';
import { formatarData, formatarDataHora } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';
import { useAlternarVeiculo, useCliente } from '@/hooks/use-clientes';
import { mensagemDeErro } from '@/lib/api';

const TOM_RELACIONAMENTO: Record<Relacionamento, TomEtiqueta> = {
  ATIVO: 'positivo',
  EM_RISCO: 'atencao',
  INATIVO: 'critico',
  SEM_ATENDIMENTO: 'neutro',
};

const TOM_STATUS: Record<StatusAgendamento, TomEtiqueta> = {
  AGENDADO: 'informativo',
  EM_ANDAMENTO: 'acento',
  CONCLUIDO: 'positivo',
  CANCELADO: 'neutro',
};

export function FichaDoCliente({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useCliente(id);
  const alternarVeiculo = useAlternarVeiculo();

  const [editandoCliente, setEditandoCliente] = useState(false);
  const [veiculoAberto, setVeiculoAberto] = useState(false);
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<number | undefined>(undefined);

  if (isLoading) {
    return (
      <>
        <Esqueleto className="mb-6 h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} className="h-28" />
          ))}
        </div>
        <Esqueleto className="mt-4 h-80" />
      </>
    );
  }

  if (isError || data === undefined) {
    return (
      <Cartao>
        <Vazio
          icone={AlertTriangle}
          titulo="Cliente não encontrado"
          descricao={mensagemDeErro(error)}
          acao={
            <Botao comoFilho variante="contorno">
              <Link href="/painel/clientes">
                <ArrowLeft />
                Voltar para clientes
              </Link>
            </Botao>
          }
        />
      </Cartao>
    );
  }

  const cliente = data.cliente;
  const iniciais: ValoresIniciaisCliente = {
    id: cliente.id,
    nome: cliente.nome,
    cpfCnpj: cliente.cpfCnpj,
    telefone: cliente.telefone,
    email: cliente.email,
    cep: cliente.cep,
    logradouro: cliente.logradouro,
    numero: cliente.numero,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    uf: cliente.uf,
    observacoes: cliente.observacoes,
  };

  const veiculoAtual = data.veiculos.find((veiculo) => veiculo.id === veiculoEmEdicao);

  return (
    <>
      <Botao comoFilho variante="fantasma" tamanho="pequeno" className="mb-4">
        <Link href="/painel/clientes">
          <ArrowLeft />
          Clientes
        </Link>
      </Botao>

      <CabecalhoDePagina
        titulo={cliente.nome}
        descricao={`${formatarTelefone(cliente.telefone)}${
          cliente.cpfCnpj === null ? '' : ` · ${formatarCpfCnpj(cliente.cpfCnpj)}`
        }`}
        acao={
          <>
            {data.whatsapp !== null ? (
              <Botao comoFilho variante="contorno">
                <a href={data.whatsapp} target="_blank" rel="noreferrer noopener">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Botao>
            ) : null}
            <Botao variante="suave" onClick={() => setEditandoCliente(true)}>
              <Pencil />
              Editar
            </Botao>
            <Botao comoFilho variante="acento">
              <Link href={`/painel/agenda/novo?clienteId=${cliente.id}`}>
                <CalendarPlus />
                Agendar
              </Link>
            </Botao>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Etiqueta tom={TOM_RELACIONAMENTO[data.relacionamento]}>
          {CATALOGO_RELACIONAMENTO[data.relacionamento].rotulo}
        </Etiqueta>
        <span className="text-xs text-[var(--tinta-tenue)]">
          {CATALOGO_RELACIONAMENTO[data.relacionamento].descricao}
        </span>
        {!cliente.ativo ? <Etiqueta tom="neutro">Cliente arquivado</Etiqueta> : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Atendimentos concluídos" valor={String(data.totalAtendimentos)} />
        <Indicador
          rotulo="Total gasto"
          valor={formatarMoeda(data.valorTotalGasto)}
          tom="acento"
        />
        <Indicador rotulo="Ticket médio" valor={formatarMoeda(data.ticketMedio)} />
        <Indicador
          rotulo="Último atendimento"
          valor={data.ultimoAtendimento === null ? '—' : formatarData(data.ultimoAtendimento)}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2">
          <CartaoCabecalho
            titulo="Veículos"
            descricao="Placa é única por empresa"
            acao={
              <Botao
                variante="suave"
                tamanho="pequeno"
                onClick={() => {
                  setVeiculoEmEdicao(undefined);
                  setVeiculoAberto(true);
                }}
              >
                <Plus />
                Adicionar
              </Botao>
            }
          />
          {data.veiculos.length === 0 ? (
            <Vazio
              icone={Car}
              titulo="Nenhum veículo cadastrado"
              descricao="Cadastre o veículo para poder agendar um atendimento."
            />
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {data.veiculos.map((veiculo) => (
                <li
                  key={veiculo.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--superficie-2)]">
                    <Car className="size-4 text-[var(--acento-ativo)]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--tinta)]">
                      {veiculo.marca} {veiculo.modelo}
                    </p>
                    <p className="truncate text-xs text-[var(--tinta-tenue)]">
                      <span className="numerico">{formatarPlaca(veiculo.placa)}</span>
                      {veiculo.cor !== null ? ` · ${veiculo.cor}` : ''}
                      {veiculo.ano !== null ? ` · ${veiculo.ano}` : ''}
                    </p>
                  </div>
                  {!veiculo.ativo ? <Etiqueta tom="neutro">Arquivado</Etiqueta> : null}
                  <div className="flex gap-1">
                    <Botao
                      variante="fantasma"
                      tamanho="iconePequeno"
                      aria-label={`Editar ${veiculo.modelo}`}
                      onClick={() => {
                        setVeiculoEmEdicao(veiculo.id);
                        setVeiculoAberto(true);
                      }}
                    >
                      <Pencil />
                    </Botao>
                    <Botao
                      variante="fantasma"
                      tamanho="iconePequeno"
                      aria-label={veiculo.ativo ? 'Arquivar veículo' : 'Reativar veículo'}
                      onClick={() =>
                        alternarVeiculo.mutate({ id: veiculo.id, ativo: !veiculo.ativo })
                      }
                    >
                      {veiculo.ativo ? <ArchiveRestore /> : <RotateCcw />}
                    </Botao>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <CartaoCabecalho titulo="Contato e endereço" />
          <CartaoCorpo className="space-y-3.5 text-sm">
            <div>
              <p className="rotulo-tecnico">Telefone</p>
              <p className="numerico mt-0.5 text-[var(--tinta)]">
                {formatarTelefone(cliente.telefone)}
              </p>
            </div>
            <div>
              <p className="rotulo-tecnico">E-mail</p>
              <p className="mt-0.5 break-all text-[var(--tinta)]">{cliente.email ?? '—'}</p>
            </div>
            <div>
              <p className="rotulo-tecnico">Endereço</p>
              <p className="mt-0.5 text-[var(--tinta)]">
                {cliente.logradouro === null
                  ? 'Não cadastrado'
                  : `${cliente.logradouro}${cliente.numero === null ? '' : `, ${cliente.numero}`}`}
              </p>
              {cliente.cidade !== null ? (
                <p className="text-[var(--tinta-suave)]">
                  {cliente.bairro !== null ? `${cliente.bairro} · ` : ''}
                  {cliente.cidade}
                  {cliente.uf !== null ? `/${cliente.uf}` : ''}
                  {cliente.cep !== null ? ` · ${formatarCep(cliente.cep)}` : ''}
                </p>
              ) : null}
              {data.mapa !== null ? (
                <a
                  href={data.mapa}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--acento-ativo)] underline-offset-4 hover:underline"
                >
                  <MapPin className="size-3.5" />
                  Traçar rota
                </a>
              ) : null}
            </div>
            {cliente.observacoes !== null ? (
              <div>
                <p className="rotulo-tecnico">Observações</p>
                <p className="mt-0.5 whitespace-pre-line text-[var(--tinta-suave)]">
                  {cliente.observacoes}
                </p>
              </div>
            ) : null}
          </CartaoCorpo>
        </Cartao>
      </div>

      <Cartao className="mt-4">
        <CartaoCabecalho
          titulo="Histórico de atendimentos"
          descricao="Últimos 50 registros"
        />
        {data.historico.length === 0 ? (
          <Vazio icone={Car} titulo="Sem atendimentos registrados" />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Coluna>Data</Coluna>
                <Coluna>Veículo</Coluna>
                <Coluna>Status</Coluna>
                <Coluna>Pagamento</Coluna>
                <Coluna numerica>Total</Coluna>
                <Coluna className="text-right">Detalhe</Coluna>
              </tr>
            </Cabecalho>
            <Corpo>
              {data.historico.map((item) => (
                <Linha key={item.id}>
                  <Celula>{formatarDataHora(item.dataHora)}</Celula>
                  <Celula>{item.veiculo}</Celula>
                  <Celula>
                    <Etiqueta tom={TOM_STATUS[item.status as StatusAgendamento]}>
                      {ROTULO_STATUS[item.status as StatusAgendamento]}
                    </Etiqueta>
                  </Celula>
                  <Celula>
                    <Etiqueta tom={item.pago ? 'positivo' : 'atencao'}>
                      {item.pago ? 'Pago' : 'Em aberto'}
                    </Etiqueta>
                  </Celula>
                  <Celula numerica>{formatarMoeda(item.total)}</Celula>
                  <Celula className="text-right">
                    <Botao comoFilho variante="fantasma" tamanho="pequeno">
                      <Link href={`/painel/agenda/${item.id}`}>Abrir</Link>
                    </Botao>
                  </Celula>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>

      <FormularioDeCliente
        aberto={editandoCliente}
        aoFechar={() => setEditandoCliente(false)}
        inicial={iniciais}
      />

      <FormularioDeVeiculo
        aberto={veiculoAberto}
        aoFechar={() => {
          setVeiculoAberto(false);
          setVeiculoEmEdicao(undefined);
        }}
        clienteId={cliente.id}
        inicial={
          veiculoAtual === undefined
            ? undefined
            : {
                id: veiculoAtual.id,
                placa: veiculoAtual.placa,
                marca: veiculoAtual.marca,
                modelo: veiculoAtual.modelo,
                cor: veiculoAtual.cor,
                ano: veiculoAtual.ano,
                observacoes: veiculoAtual.observacoes,
              }
        }
      />
    </>
  );
}
