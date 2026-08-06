/**
 * Validacao e normalizacao de documentos brasileiros e placas veiculares.
 * Funcoes puras, sem dependencia externa.
 */

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

function todosDigitosIguais(valor: string): boolean {
  return new Set(valor).size === 1;
}

function digitoVerificador(base: string, pesoInicial: number): number {
  let soma = 0;
  let peso = pesoInicial;
  for (const caractere of base) {
    soma += Number(caractere) * peso;
    peso -= 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function digitoVerificadorCnpj(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < base.length; i += 1) {
    soma += Number(base.charAt(i)) * (pesos[i] ?? 0);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string | null | undefined): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || todosDigitosIguais(cpf)) return false;
  const primeiro = digitoVerificador(cpf.slice(0, 9), 10);
  const segundo = digitoVerificador(cpf.slice(0, 10), 11);
  return primeiro === Number(cpf.charAt(9)) && segundo === Number(cpf.charAt(10));
}

export function cnpjValido(valor: string | null | undefined): boolean {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || todosDigitosIguais(cnpj)) return false;
  const primeiro = digitoVerificadorCnpj(cnpj.slice(0, 12));
  const segundo = digitoVerificadorCnpj(cnpj.slice(0, 13));
  return primeiro === Number(cnpj.charAt(12)) && segundo === Number(cnpj.charAt(13));
}

/** Documento do cliente e opcional: vazio e considerado valido. */
export function cpfOuCnpjValido(valor: string | null | undefined): boolean {
  const digitos = somenteDigitos(valor);
  if (digitos === '') return true;
  if (digitos.length === 11) return cpfValido(digitos);
  if (digitos.length === 14) return cnpjValido(digitos);
  return false;
}

const PLACA_ANTIGA = /^[A-Z]{3}\d{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizarPlaca(valor: string | null | undefined): string {
  return (valor ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function placaValida(valor: string | null | undefined): boolean {
  const placa = normalizarPlaca(valor);
  return PLACA_ANTIGA.test(placa) || PLACA_MERCOSUL.test(placa);
}

export function telefoneValido(valor: string | null | undefined): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

export function cepValido(valor: string | null | undefined): boolean {
  return somenteDigitos(valor).length === 8;
}

// --------------------------------------------------------------------------
// Formatacao para exibicao
// --------------------------------------------------------------------------

export function formatarCpfCnpj(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }
  if (digitos.length === 14) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
  }
  return valor ?? '—';
}

export function formatarTelefone(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor ?? '—';
}

export function formatarCep(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 8) return valor ?? '—';
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function formatarPlaca(valor: string | null | undefined): string {
  const placa = normalizarPlaca(valor);
  if (PLACA_ANTIGA.test(placa)) return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  return placa || '—';
}
