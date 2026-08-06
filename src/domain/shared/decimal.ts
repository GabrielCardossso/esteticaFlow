/**
 * Aritmetica decimal exata sobre inteiros escalados (BigInt).
 * Dinheiro nunca passa por ponto flutuante: todo valor monetario circula como
 * string com 2 casas, e toda conta acontece em centavos.
 */

const ESCALA_DINHEIRO = 2;
const ESCALA_QUANTIDADE = 3;

function potencia(escala: number): bigint {
  return 10n ** BigInt(escala);
}

/** Converte "12.34" | 12.34 para o inteiro escalado (1234 com escala 2). */
export function escalar(valor: string | number, escala: number): bigint {
  const texto = typeof valor === 'number' ? valor.toFixed(escala + 4) : valor.trim();
  if (texto === '') return 0n;

  const negativo = texto.startsWith('-');
  const semSinal = negativo ? texto.slice(1) : texto;
  const [inteiroBruto = '0', fracaoBruta = ''] = semSinal.split('.');

  if (!/^\d*$/.test(inteiroBruto) || !/^\d*$/.test(fracaoBruta)) {
    throw new TypeError(`Valor decimal invalido: "${valor}"`);
  }

  const fracaoAjustada = fracaoBruta.padEnd(escala + 1, '0');
  const fracaoTruncada = fracaoAjustada.slice(0, escala);
  const proximoDigito = Number(fracaoAjustada.charAt(escala) ?? '0');

  let bruto = BigInt(inteiroBruto || '0') * potencia(escala) + BigInt(fracaoTruncada || '0');
  if (proximoDigito >= 5) bruto += 1n; // HALF_UP

  return negativo ? -bruto : bruto;
}

/** Converte o inteiro escalado de volta para string com casas fixas. */
export function desescalar(bruto: bigint, escala: number): string {
  const negativo = bruto < 0n;
  const absoluto = negativo ? -bruto : bruto;
  const base = potencia(escala);
  const inteiro = absoluto / base;
  const fracao = (absoluto % base).toString().padStart(escala, '0');
  const texto = escala === 0 ? `${inteiro}` : `${inteiro}.${fracao}`;
  return negativo ? `-${texto}` : texto;
}

/**
 * Divisão inteira com arredondamento HALF_UP, sem reescalar.
 * Usada para converter entre escalas, onde o fator já está embutido.
 */
function dividirInteiro(dividendo: bigint, divisor: bigint): bigint {
  if (divisor === 0n) throw new RangeError('Divisao por zero.');
  const sinal = (dividendo < 0n) !== (divisor < 0n) ? -1n : 1n;
  const a = dividendo < 0n ? -dividendo : dividendo;
  const b = divisor < 0n ? -divisor : divisor;
  const quociente = (a * 10n) / b;
  const arredondado = quociente % 10n >= 5n ? quociente / 10n + 1n : quociente / 10n;
  return sinal * arredondado;
}

/** Divide inteiros escalados, devolvendo o resultado já na escala informada. */
function dividirBruto(dividendo: bigint, divisor: bigint, escala: number): bigint {
  if (divisor === 0n) throw new RangeError('Divisao por zero.');
  const sinal = (dividendo < 0n) !== (divisor < 0n) ? -1n : 1n;
  const a = dividendo < 0n ? -dividendo : dividendo;
  const b = divisor < 0n ? -divisor : divisor;
  const ampliado = a * potencia(escala) * 10n;
  const quociente = ampliado / b;
  const arredondado = quociente % 10n >= 5n ? quociente / 10n + 1n : quociente / 10n;
  return sinal * arredondado;
}

function criarTipo(escala: number) {
  return {
    escala,
    zero: desescalar(0n, escala),
    de(valor: string | number): string {
      return desescalar(escalar(valor, escala), escala);
    },
    somar(...valores: Array<string | number>): string {
      const total = valores.reduce<bigint>((acc, v) => acc + escalar(v, escala), 0n);
      return desescalar(total, escala);
    },
    subtrair(a: string | number, b: string | number): string {
      return desescalar(escalar(a, escala) - escalar(b, escala), escala);
    },
    multiplicar(a: string | number, b: string | number): string {
      const bruto = escalar(a, escala) * escalar(b, escala);
      return desescalar(dividirBruto(bruto, potencia(escala) * potencia(escala), escala), escala);
    },
    dividir(a: string | number, b: string | number): string {
      return desescalar(dividirBruto(escalar(a, escala), escalar(b, escala), escala), escala);
    },
    comparar(a: string | number, b: string | number): -1 | 0 | 1 {
      const x = escalar(a, escala);
      const y = escalar(b, escala);
      return x < y ? -1 : x > y ? 1 : 0;
    },
    ehZero(valor: string | number): boolean {
      return escalar(valor, escala) === 0n;
    },
    ehPositivo(valor: string | number): boolean {
      return escalar(valor, escala) > 0n;
    },
    ehNegativo(valor: string | number): boolean {
      return escalar(valor, escala) < 0n;
    },
    paraNumero(valor: string | number): number {
      return Number(desescalar(escalar(valor, escala), escala));
    },
  };
}

/** Valores monetarios em BRL, sempre com 2 casas. */
export const Dinheiro = criarTipo(ESCALA_DINHEIRO);

/** Quantidades de estoque, sempre com 3 casas. */
export const Quantidade = criarTipo(ESCALA_QUANTIDADE);

/** Converte entre escalas preservando o valor (ex.: quantidade -> dinheiro). */
export function reescalar(valor: string | number, deEscala: number, paraEscala: number): string {
  const bruto = escalar(valor, deEscala);
  if (paraEscala >= deEscala) {
    return desescalar(bruto * potencia(paraEscala - deEscala), paraEscala);
  }
  return desescalar(dividirInteiro(bruto, potencia(deEscala - paraEscala)), paraEscala);
}

/**
 * Divisao com escala arbitraria de saida. Usada no custo unitario, que precisa
 * de 4 casas para nao perder centavos em produtos vendidos por mililitro.
 */
export function dividirComEscala(
  a: string | number,
  b: string | number,
  escalaSaida: number,
): string {
  const ESCALA_INTERNA = 10;
  const bruto = dividirBruto(escalar(a, ESCALA_INTERNA), escalar(b, ESCALA_INTERNA), ESCALA_INTERNA);
  return desescalar(
    dividirInteiro(bruto, potencia(ESCALA_INTERNA - escalaSaida)),
    escalaSaida,
  );
}
