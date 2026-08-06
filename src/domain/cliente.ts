import { diasEntre, hojeISO, type EntradaData } from './shared/tempo';

export const RELACIONAMENTOS = ['ATIVO', 'EM_RISCO', 'INATIVO', 'SEM_ATENDIMENTO'] as const;
export type Relacionamento = (typeof RELACIONAMENTOS)[number];

interface DefinicaoRelacionamento {
  readonly rotulo: string;
  readonly descricao: string;
  readonly tom: 'positivo' | 'atencao' | 'critico' | 'neutro';
}

export const CATALOGO_RELACIONAMENTO: Readonly<
  Record<Relacionamento, DefinicaoRelacionamento>
> = {
  ATIVO: {
    rotulo: 'Cliente ativo',
    descricao: 'Atendido nos últimos 30 dias',
    tom: 'positivo',
  },
  EM_RISCO: {
    rotulo: 'Cliente em risco',
    descricao: 'Entre 30 e 90 dias sem retornar',
    tom: 'atencao',
  },
  INATIVO: {
    rotulo: 'Cliente inativo',
    descricao: 'Mais de 90 dias sem retornar',
    tom: 'critico',
  },
  SEM_ATENDIMENTO: {
    rotulo: 'Sem atendimentos',
    descricao: 'Ainda não teve atendimento concluído',
    tom: 'neutro',
  },
};

/**
 * Classifica o vinculo do cliente pela data do ultimo atendimento concluido.
 * Serve para priorizar contato de reativacao.
 */
export function classificarRelacionamento(
  ultimoAtendimento: EntradaData | null | undefined,
  referencia: EntradaData = hojeISO(),
): Relacionamento {
  if (ultimoAtendimento === null || ultimoAtendimento === undefined) return 'SEM_ATENDIMENTO';
  const dias = diasEntre(ultimoAtendimento, referencia);
  if (dias <= 30) return 'ATIVO';
  if (dias <= 90) return 'EM_RISCO';
  return 'INATIVO';
}

export function precisaReativacao(relacionamento: Relacionamento): boolean {
  return relacionamento === 'EM_RISCO' || relacionamento === 'INATIVO';
}

// --------------------------------------------------------------------------
// Links de contato rapido
// --------------------------------------------------------------------------

const DDI_BRASIL = '55';

export function linkWhatsApp(telefone: string | null | undefined, mensagem = 'Olá'): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const comDdi = digitos.startsWith(DDI_BRASIL) ? digitos : `${DDI_BRASIL}${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}

export interface Endereco {
  readonly logradouro?: string | null;
  readonly numero?: string | null;
  readonly bairro?: string | null;
  readonly cidade?: string | null;
  readonly uf?: string | null;
  readonly cep?: string | null;
}

export function enderecoEmLinha(endereco: Endereco): string | null {
  const partes = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    endereco.cep,
  ]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));
  return partes.length === 0 ? null : partes.join(', ');
}

export function linkMapa(endereco: Endereco): string | null {
  const consulta = enderecoEmLinha(endereco);
  if (consulta === null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consulta)}`;
}

export function resumoDoEndereco(endereco: Endereco): string {
  const linha = enderecoEmLinha(endereco);
  return linha ?? 'Endereço não cadastrado';
}
