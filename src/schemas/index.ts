import { z } from 'zod';
import { FILTROS_PERIODO } from '@/domain/relatorio';
import { PAPEIS, PLANOS } from '@/domain/plano';
import { STATUS_AGENDAMENTO } from '@/domain/agendamento';
import { UNIDADES, unidadesCompativeis } from '@/domain/estoque';
import { ACENTOS, MINUTOS_INATIVIDADE, MODOS } from '@/domain/tema';
import {
  booleanoDeQuery,
  cepOpcional,
  cnpjObrigatorio,
  dataHoraISO,
  dataISO,
  dinheiroNaoNegativo,
  dinheiroOpcional,
  dinheiroPositivo,
  documentoOpcional,
  emailObrigatorio,
  emailOpcional,
  idNumerico,
  placaObrigatoria,
  senha,
  telefoneObrigatorio,
  telefoneOpcional,
  textoObrigatorio,
  textoOpcional,
  ufOpcional,
} from './comuns';

export * from './comuns';

// ---------------------------------------------------------------------------
// Autenticacao
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailObrigatorio,
  senha: z.string().min(1, 'Informe sua senha.'),
  lembrar: z.boolean().default(false),
});
export type LoginInput = z.input<typeof loginSchema>;
export type LoginPayload = z.output<typeof loginSchema>;

export const alterarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: senha,
    confirmacao: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((dados) => dados.novaSenha === dados.confirmacao, {
    message: 'A confirmação não confere com a nova senha.',
    path: ['confirmacao'],
  });
export type AlterarSenhaInput = z.input<typeof alterarSenhaSchema>;

// ---------------------------------------------------------------------------
// Cliente e veiculo
// ---------------------------------------------------------------------------

export const clienteSchema = z.object({
  nome: textoObrigatorio('Nome', 150),
  cpfCnpj: documentoOpcional,
  telefone: telefoneObrigatorio,
  email: emailOpcional,
  cep: cepOpcional,
  logradouro: textoOpcional(150),
  numero: textoOpcional(20),
  complemento: textoOpcional(100),
  bairro: textoOpcional(100),
  cidade: textoOpcional(100),
  uf: ufOpcional,
  observacoes: textoOpcional(500),
});
export type ClienteInput = z.input<typeof clienteSchema>;
export type ClientePayload = z.output<typeof clienteSchema>;

export const veiculoSchema = z.object({
  clienteId: idNumerico,
  placa: placaObrigatoria,
  marca: textoObrigatorio('Marca', 60),
  modelo: textoObrigatorio('Modelo', 100),
  cor: textoOpcional(30),
  ano: z
    .union([z.coerce.number().int(), z.literal(''), z.null()])
    .transform((valor) => (valor === '' || valor === null ? null : valor))
    .refine(
      (valor) => valor === null || (valor >= 1950 && valor <= 2100),
      'Ano deve estar entre 1950 e 2100.',
    )
    .nullable()
    .default(null),
  observacoes: textoOpcional(500),
});
export type VeiculoInput = z.input<typeof veiculoSchema>;
export type VeiculoPayload = z.output<typeof veiculoSchema>;

export const filtroClientesSchema = z.object({
  busca: z.string().trim().default(''),
  situacao: z.enum(['ativos', 'inativos', 'todos']).default('ativos'),
  relacionamento: z
    .enum(['todos', 'ATIVO', 'EM_RISCO', 'INATIVO', 'SEM_ATENDIMENTO'])
    .default('todos'),
  ordenacao: z.enum(['nome', 'ultimo_atendimento', 'valor_gasto', 'atendimentos']).default('nome'),
});
export type FiltroClientes = z.output<typeof filtroClientesSchema>;

// ---------------------------------------------------------------------------
// Servico
// ---------------------------------------------------------------------------

export const servicoSchema = z.object({
  nome: textoObrigatorio('Nome', 150),
  descricao: textoOpcional(500),
  preco: dinheiroPositivo('Preço'),
  tempoEstimadoMinutos: z.coerce
    .number({ invalid_type_error: 'Informe o tempo estimado.' })
    .int('O tempo deve ser um número inteiro de minutos.')
    .min(5, 'O tempo mínimo é de 5 minutos.')
    .max(1440, 'O tempo máximo é de 24 horas.'),
  categoriaServicoId: idNumerico,
});
export type ServicoInput = z.input<typeof servicoSchema>;
export type ServicoPayload = z.output<typeof servicoSchema>;

export const categoriaSchema = z.object({
  nome: textoObrigatorio('Nome da categoria', 100),
});
export type CategoriaInput = z.input<typeof categoriaSchema>;

export const filtroServicosSchema = z.object({
  busca: z.string().trim().default(''),
  categoriaId: z.coerce.number().int().positive().optional(),
  situacao: z.enum(['ativos', 'inativos', 'todos']).default('ativos'),
  ordenacao: z.enum(['nome', 'preco_asc', 'preco_desc', 'duracao']).default('nome'),
});
export type FiltroServicos = z.output<typeof filtroServicosSchema>;

// ---------------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------------

export const agendamentoSchema = z.object({
  clienteId: idNumerico,
  veiculoId: idNumerico,
  servicoIds: z
    .array(idNumerico)
    .min(1, 'Selecione ao menos um serviço.')
    .max(20, 'Máximo de 20 serviços por atendimento.'),
  responsavelId: z
    .union([idNumerico, z.literal(''), z.null()])
    .transform((valor) => (valor === '' || valor === null ? null : valor))
    .nullable()
    .default(null),
  dataHora: dataHoraISO,
  desconto: dinheiroNaoNegativo('Desconto').default('0'),
  observacoes: textoOpcional(500),
  confirmarConflito: z.boolean().default(false),
});
export type AgendamentoInput = z.input<typeof agendamentoSchema>;
export type AgendamentoPayload = z.output<typeof agendamentoSchema>;

export const pagamentoSchema = z.object({
  formaPagamentoId: idNumerico,
  parcelas: z.coerce.number().int().min(1).max(12).default(1),
});
export type PagamentoInput = z.input<typeof pagamentoSchema>;
export type PagamentoPayload = z.output<typeof pagamentoSchema>;

export const concluirSchema = z.object({
  formaPagamentoId: z
    .union([idNumerico, z.literal(''), z.null()])
    .transform((valor) => (valor === '' || valor === null ? null : valor))
    .nullable()
    .default(null),
  parcelas: z.coerce.number().int().min(1).max(12).default(1),
  consumos: z
    .array(
      z.object({
        produtoId: idNumerico,
        quantidade: dinheiroPositivo('Quantidade'),
        unidadeMedida: z.enum(UNIDADES, { required_error: 'Selecione a unidade.' }),
      }),
    )
    .default([]),
});
export type ConcluirInput = z.input<typeof concluirSchema>;
export type ConcluirPayload = z.output<typeof concluirSchema>;

export const filtroAgendaSchema = z.object({
  data: dataISO.optional(),
  periodo: z.enum(['DIA', 'SEMANA', 'MES']).default('DIA'),
  status: z.enum(STATUS_AGENDAMENTO).optional(),
  responsavelId: z.coerce.number().int().positive().optional(),
  pago: z.enum(['todos', 'pagos', 'pendentes']).default('todos'),
  busca: z.string().trim().default(''),
});
export type FiltroAgenda = z.output<typeof filtroAgendaSchema>;

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export const produtoSchema = z
  .object({
    nome: textoObrigatorio('Nome', 150),
    categoriaProdutoId: idNumerico,
    unidadeEstoque: z.enum(UNIDADES, { required_error: 'Selecione a unidade de estoque.' }),
    unidadeMinima: z.enum(UNIDADES, { required_error: 'Selecione a unidade do alerta.' }),
    quantidadeEmbalagem: dinheiroPositivo('Quantidade da embalagem'),
    valorEmbalagem: dinheiroNaoNegativo('Valor da embalagem'),
    quantidadeInicial: dinheiroNaoNegativo('Quantidade inicial').default('0'),
    quantidadeMinima: dinheiroNaoNegativo('Quantidade mínima').default('0'),
  })
  .superRefine((dados, contexto) => {
    if (!unidadesCompativeis(dados.unidadeEstoque, dados.unidadeMinima)) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unidadeMinima'],
        message: 'O alerta mínimo deve usar uma unidade compatível com o estoque.',
      });
    }
  });
export type ProdutoInput = z.input<typeof produtoSchema>;
export type ProdutoPayload = z.output<typeof produtoSchema>;

export const entradaEstoqueSchema = z.object({
  quantidade: dinheiroPositivo('Quantidade'),
  unidadeMedida: z.enum(UNIDADES, { required_error: 'Selecione a unidade.' }),
  valorPago: dinheiroOpcional('Valor pago'),
  motivo: textoOpcional(500),
});
export type EntradaEstoqueInput = z.input<typeof entradaEstoqueSchema>;
export type EntradaEstoquePayload = z.output<typeof entradaEstoqueSchema>;

export const saidaEstoqueSchema = z.object({
  quantidade: dinheiroPositivo('Quantidade'),
  unidadeMedida: z.enum(UNIDADES, { required_error: 'Selecione a unidade.' }),
  motivo: textoOpcional(500),
});
export type SaidaEstoqueInput = z.input<typeof saidaEstoqueSchema>;

export const minimoEstoqueSchema = z.object({
  quantidadeMinima: dinheiroNaoNegativo('Quantidade mínima'),
  unidadeMinima: z.enum(UNIDADES, { required_error: 'Selecione a unidade.' }),
});
export type MinimoEstoqueInput = z.input<typeof minimoEstoqueSchema>;

export const filtroEstoqueSchema = z.object({
  busca: z.string().trim().default(''),
  situacao: z.enum(['ativos', 'inativos', 'todos']).default('ativos'),
  somenteBaixo: booleanoDeQuery,
  ordenacao: z.enum(['nome', 'saldo_asc', 'saldo_desc', 'valor']).default('nome'),
});
export type FiltroEstoque = z.output<typeof filtroEstoqueSchema>;

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export const despesaSchema = z.object({
  descricao: textoObrigatorio('Descrição', 200),
  categoria: z.enum(['FIXA', 'VARIAVEL', 'FORNECEDOR'], {
    required_error: 'Selecione a categoria.',
  }),
  valor: dinheiroPositivo('Valor'),
  dataPagamento: dataISO,
});
export type DespesaInput = z.input<typeof despesaSchema>;
export type DespesaPayload = z.output<typeof despesaSchema>;

export const receitaAvulsaSchema = z.object({
  descricao: textoObrigatorio('Descrição', 200),
  valor: dinheiroPositivo('Valor'),
  formaPagamentoId: idNumerico,
  dataRecebimento: dataISO,
});
export type ReceitaAvulsaInput = z.input<typeof receitaAvulsaSchema>;
export type ReceitaAvulsaPayload = z.output<typeof receitaAvulsaSchema>;

export const filtroFinanceiroSchema = z.object({
  inicio: dataISO.optional(),
  fim: dataISO.optional(),
  tipo: z.enum(['todos', 'entradas', 'saidas']).default('todos'),
  busca: z.string().trim().default(''),
});
export type FiltroFinanceiro = z.output<typeof filtroFinanceiroSchema>;

// ---------------------------------------------------------------------------
// Relatorios
// ---------------------------------------------------------------------------

export const filtroRelatorioSchema = z.object({
  filtro: z.enum(FILTROS_PERIODO).default('MES'),
  referencia: dataISO.optional(),
  empresaId: z.coerce.number().int().positive().optional(),
});
export type FiltroRelatorio = z.output<typeof filtroRelatorioSchema>;

// ---------------------------------------------------------------------------
// Configuracoes
// ---------------------------------------------------------------------------

export const usuarioSchema = z.object({
  nome: textoObrigatorio('Nome', 150),
  email: emailObrigatorio,
  papel: z.enum(['ADMINISTRADOR', 'FUNCIONARIO'], { required_error: 'Selecione o perfil.' }),
  senha: senha.optional(),
});
export type UsuarioInput = z.input<typeof usuarioSchema>;
export type UsuarioPayload = z.output<typeof usuarioSchema>;

export const novoUsuarioSchema = usuarioSchema.extend({ senha });
export type NovoUsuarioInput = z.input<typeof novoUsuarioSchema>;

export const dadosEmpresaSchema = z.object({
  razaoSocial: textoObrigatorio('Razão social', 150),
  nomeFantasia: textoObrigatorio('Nome fantasia', 150),
  cnpj: cnpjObrigatorio,
  telefone: telefoneOpcional,
  email: emailOpcional,
});
export type DadosEmpresaInput = z.input<typeof dadosEmpresaSchema>;
export type DadosEmpresaPayload = z.output<typeof dadosEmpresaSchema>;

export const temaSchema = z.object({
  acento: z.enum(ACENTOS),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor no formato #RRGGBB.')
    .optional(),
  modo: z.enum(MODOS).default('escuro'),
});
export type TemaInput = z.input<typeof temaSchema>;
export type TemaPayload = z.output<typeof temaSchema>;

export const sessaoSchema = z.object({
  inatividadeAtiva: z.boolean().default(false),
  minutos: z.coerce
    .number()
    .refine(
      (valor) => (MINUTOS_INATIVIDADE as readonly number[]).includes(valor),
      'Tempo de inatividade inválido.',
    )
    .default(30),
});
export type SessaoInput = z.input<typeof sessaoSchema>;

export const formaPagamentoSchema = z.object({
  nome: textoObrigatorio('Nome da forma de pagamento', 50),
});
export type FormaPagamentoInput = z.input<typeof formaPagamentoSchema>;

// ---------------------------------------------------------------------------
// Plataforma (SUPER_ADMIN)
// ---------------------------------------------------------------------------

export const novaEmpresaSchema = dadosEmpresaSchema.extend({
  plano: z.enum(PLANOS, { required_error: 'Selecione o plano.' }),
  valorMensalidade: dinheiroOpcional('Mensalidade'),
  proximoVencimento: dataISO,
  adminNome: textoObrigatorio('Nome do administrador', 150),
  adminEmail: emailObrigatorio,
  adminSenha: senha,
});
export type NovaEmpresaInput = z.input<typeof novaEmpresaSchema>;
export type NovaEmpresaPayload = z.output<typeof novaEmpresaSchema>;

export const assinaturaSchema = z.object({
  plano: z.enum(PLANOS),
  valorMensalidade: dinheiroNaoNegativo('Mensalidade'),
  proximoVencimento: dataISO,
});
export type AssinaturaInput = z.input<typeof assinaturaSchema>;
export type AssinaturaPayload = z.output<typeof assinaturaSchema>;

export const bloqueioSchema = z.object({
  motivo: textoObrigatorio('Motivo do bloqueio', 500),
  manual: z.boolean().default(false),
});
export type BloqueioInput = z.input<typeof bloqueioSchema>;

export const decisaoSolicitacaoSchema = z.object({
  motivo: textoOpcional(500),
});
export type DecisaoSolicitacaoInput = z.input<typeof decisaoSolicitacaoSchema>;

export const filtroEmpresasSchema = z.object({
  busca: z.string().trim().default(''),
  plano: z.enum(PLANOS).optional(),
  situacao: z.enum(['ativas', 'inativas', 'todas']).default('ativas'),
});
export type FiltroEmpresas = z.output<typeof filtroEmpresasSchema>;

export const papelSchema = z.enum(PAPEIS);
