import { z } from 'zod';
import {
  cepValido,
  cpfOuCnpjValido,
  cnpjValido,
  normalizarPlaca,
  placaValida,
  somenteDigitos,
  telefoneValido,
} from '@/domain/shared/documento';

/** Texto obrigatorio ja normalizado (trim + limite). */
export const textoObrigatorio = (campo: string, max: number) =>
  z
    .string({ required_error: `${campo} é obrigatório.` })
    .trim()
    .min(1, `${campo} é obrigatório.`)
    .max(max, `${campo} deve ter no máximo ${max} caracteres.`);

/** Texto opcional: string vazia vira null. */
export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Deve ter no máximo ${max} caracteres.`)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .default(null);

export const emailObrigatorio = z
  .string({ required_error: 'E-mail é obrigatório.' })
  .trim()
  .toLowerCase()
  .min(1, 'E-mail é obrigatório.')
  .max(150, 'E-mail deve ter no máximo 150 caracteres.')
  .email('Informe um e-mail válido.');

export const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(150, 'E-mail deve ter no máximo 150 caracteres.')
  .refine((valor) => valor === '' || z.string().email().safeParse(valor).success, {
    message: 'Informe um e-mail válido.',
  })
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()
  .default(null);

export const senha = z
  .string({ required_error: 'Senha é obrigatória.' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.');

export const telefoneObrigatorio = z
  .string({ required_error: 'Telefone é obrigatório.' })
  .transform(somenteDigitos)
  .refine(telefoneValido, 'Telefone deve ter 10 ou 11 dígitos.');

export const telefoneOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine((valor) => valor === '' || telefoneValido(valor), 'Telefone deve ter 10 ou 11 dígitos.')
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()
  .default(null);

export const documentoOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine(cpfOuCnpjValido, 'CPF/CNPJ inválido.')
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()
  .default(null);

export const cnpjObrigatorio = z
  .string({ required_error: 'CNPJ é obrigatório.' })
  .transform(somenteDigitos)
  .refine(cnpjValido, 'CNPJ inválido.');

export const cepOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine((valor) => valor === '' || cepValido(valor), 'CEP deve ter 8 dígitos.')
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()
  .default(null);

export const ufOpcional = z
  .string()
  .trim()
  .toUpperCase()
  .refine((valor) => valor === '' || /^[A-Z]{2}$/.test(valor), 'UF deve ter 2 letras.')
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()
  .default(null);

export const placaObrigatoria = z
  .string({ required_error: 'Placa é obrigatória.' })
  .transform(normalizarPlaca)
  .refine(placaValida, 'Placa inválida. Use ABC1234 ou ABC1D23.');

/** Valor monetario vindo de formulario: aceita "1.234,56" ou "1234.56". */
export const dinheiro = (campo: string) =>
  z
    .union([z.string(), z.number()])
    .transform((valor) => {
      if (typeof valor === 'number') return valor.toFixed(2);
      const limpo = valor.trim().replace(/\s/g, '').replace(/R\$/gi, '');
      if (limpo === '') return '';
      const normalizado = limpo.includes(',')
        ? limpo.replace(/\./g, '').replace(',', '.')
        : limpo;
      return normalizado;
    })
    .refine((valor) => valor !== '' && /^-?\d+(\.\d+)?$/.test(valor), `${campo} inválido.`);

export const dinheiroPositivo = (campo: string) =>
  dinheiro(campo).refine((valor) => Number(valor) > 0, `${campo} deve ser maior que zero.`);

export const dinheiroNaoNegativo = (campo: string) =>
  dinheiro(campo).refine((valor) => Number(valor) >= 0, `${campo} não pode ser negativo.`);

export const dinheiroOpcional = (campo: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((valor) => {
      if (valor === null || valor === undefined) return null;
      if (typeof valor === 'number') return valor.toFixed(2);
      const limpo = valor.trim();
      if (limpo === '') return null;
      return limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
    })
    .refine(
      (valor) => valor === null || (/^\d+(\.\d+)?$/.test(valor) && Number(valor) >= 0),
      `${campo} inválido.`,
    );

export const idNumerico = z.coerce
  .number({ invalid_type_error: 'Identificador inválido.' })
  .int('Identificador inválido.')
  .positive('Identificador inválido.');

export const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use o formato AAAA-MM-DD.');

export const dataHoraISO = z
  .string()
  .min(16, 'Data e hora são obrigatórias.')
  .refine((valor) => !Number.isNaN(Date.parse(valor)), 'Data e hora inválidas.');

export const booleanoDeQuery = z
  .union([z.boolean(), z.string()])
  .transform((valor) => valor === true || valor === 'true' || valor === '1')
  .default(false);

export const paginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(50),
});

export type Paginacao = z.infer<typeof paginacao>;
