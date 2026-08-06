/**
 * Tema da marca do tenant. A identidade visual do produto e um painel
 * automotivo: superficies grafite, tipografia tecnica, dados como telemetria.
 * A cor do tenant entra apenas como acento de instrumentacao.
 */

export const CHAVE_TEMA_COR = 'tema.cor';
export const CHAVE_TEMA_HEX = 'tema.cor.hex';
export const CHAVE_TEMA_MODO = 'tema.modo';
export const CHAVE_SESSAO_ATIVA = 'sessao.inatividade.ativa';
export const CHAVE_SESSAO_MINUTOS = 'sessao.inatividade.minutos';

export const ACENTOS = [
  'tacometro',
  'turbina',
  'nitro',
  'linha-de-corte',
  'esmeralda',
  'cobalto',
  'violeta',
  'titanio',
  'personalizado',
] as const;
export type Acento = (typeof ACENTOS)[number];

interface DefinicaoAcento {
  readonly rotulo: string;
  readonly descricao: string;
  readonly hex: string;
}

export const CATALOGO_ACENTOS: Readonly<Record<Acento, DefinicaoAcento>> = {
  tacometro: { rotulo: 'Tacômetro', descricao: 'Âmbar de instrumentação', hex: '#f59e0b' },
  turbina: { rotulo: 'Turbina', descricao: 'Ciano de HUD', hex: '#06b6d4' },
  nitro: { rotulo: 'Nitro', descricao: 'Verde-limão de injeção', hex: '#84cc16' },
  'linha-de-corte': { rotulo: 'Linha de corte', descricao: 'Vermelho de redline', hex: '#ef4444' },
  esmeralda: { rotulo: 'Esmeralda', descricao: 'Verde profundo', hex: '#10b981' },
  cobalto: { rotulo: 'Cobalto', descricao: 'Azul de painel digital', hex: '#3b82f6' },
  violeta: { rotulo: 'Violeta', descricao: 'Roxo de iluminação ambiente', hex: '#8b5cf6' },
  titanio: { rotulo: 'Titânio', descricao: 'Grafite metálico', hex: '#94a3b8' },
  personalizado: { rotulo: 'Personalizado', descricao: 'Cor da sua marca', hex: '#f59e0b' },
};

export const ACENTO_PADRAO: Acento = 'tacometro';
export const HEX_PADRAO = CATALOGO_ACENTOS[ACENTO_PADRAO].hex;

export const MODOS = ['claro', 'escuro', 'sistema'] as const;
export type ModoTema = (typeof MODOS)[number];
export const MODO_PADRAO: ModoTema = 'escuro';

const HEX_VALIDO = /^#[0-9a-f]{6}$/i;

export function hexValido(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && HEX_VALIDO.test(valor.trim());
}

export function ehAcento(valor: string | null | undefined): valor is Acento {
  return ACENTOS.includes((valor ?? '') as Acento);
}

export function ehModo(valor: string | null | undefined): valor is ModoTema {
  return MODOS.includes((valor ?? '') as ModoTema);
}

/**
 * Leitura tolerante: valores desconhecidos ou fora do plano caem no padrao,
 * sem quebrar a interface. A escrita, essa sim, rejeita valor invalido.
 */
export function resolverTema(
  bruto: { cor?: string | null | undefined; hex?: string | null | undefined; modo?: string | null | undefined },
  permitePersonalizar: boolean,
): { acento: Acento; hex: string; modo: ModoTema } {
  const modo = ehModo(bruto.modo) ? bruto.modo : MODO_PADRAO;

  if (!permitePersonalizar) {
    return { acento: ACENTO_PADRAO, hex: HEX_PADRAO, modo };
  }

  const corNormalizada = (bruto.cor ?? '').trim().toLowerCase();
  if (!ehAcento(corNormalizada)) {
    return { acento: ACENTO_PADRAO, hex: HEX_PADRAO, modo };
  }

  if (corNormalizada === 'personalizado') {
    const hex = hexValido(bruto.hex) ? (bruto.hex ?? HEX_PADRAO).trim().toLowerCase() : HEX_PADRAO;
    return { acento: 'personalizado', hex, modo };
  }

  return { acento: corNormalizada, hex: CATALOGO_ACENTOS[corNormalizada].hex, modo };
}

// --------------------------------------------------------------------------
// Contraste (WCAG AA) - o acento nunca pode comprometer a leitura do dado
// --------------------------------------------------------------------------

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexParaRgb(hex: string): Rgb {
  const limpo = hex.replace('#', '');
  return {
    r: Number.parseInt(limpo.slice(0, 2), 16),
    g: Number.parseInt(limpo.slice(2, 4), 16),
    b: Number.parseInt(limpo.slice(4, 6), 16),
  };
}

function canalLinear(valor: number): number {
  const normalizado = valor / 255;
  return normalizado <= 0.03928
    ? normalizado / 12.92
    : ((normalizado + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const { r, g, b } = hexParaRgb(hex);
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

export function razaoDeContraste(hexA: string, hexB: string): number {
  const a = luminancia(hexA);
  const b = luminancia(hexB);
  const claro = Math.max(a, b);
  const escuro = Math.min(a, b);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Texto legivel sobre o acento: preto ou branco, o que tiver mais contraste. */
export function corDeTextoSobre(hex: string): '#000000' | '#ffffff' {
  return razaoDeContraste(hex, '#ffffff') >= razaoDeContraste(hex, '#000000')
    ? '#ffffff'
    : '#000000';
}

function rgbParaHex({ r, g, b }: Rgb): string {
  const parte = (valor: number) =>
    Math.max(0, Math.min(255, Math.round(valor))).toString(16).padStart(2, '0');
  return `#${parte(r)}${parte(g)}${parte(b)}`;
}

function misturar(hex: string, alvo: Rgb, fator: number): string {
  const base = hexParaRgb(hex);
  return rgbParaHex({
    r: base.r + (alvo.r - base.r) * fator,
    g: base.g + (alvo.g - base.g) * fator,
    b: base.b + (alvo.b - base.b) * fator,
  });
}

const BRANCO: Rgb = { r: 255, g: 255, b: 255 };
const PRETO: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Ajusta o acento ate atingir contraste AA (4.5:1) contra a superficie do modo.
 * O hex salvo pelo tenant nao muda; o que muda e o token derivado.
 */
export function acentoLegivel(hex: string, fundo: string, alvo = 4.5): string {
  if (!hexValido(hex)) return HEX_PADRAO;
  let atual = hex;
  const clarear = luminancia(fundo) < 0.5;
  for (let passo = 0; passo < 20; passo += 1) {
    if (razaoDeContraste(atual, fundo) >= alvo) return atual;
    atual = misturar(atual, clarear ? BRANCO : PRETO, 0.08);
  }
  return atual;
}

export const SUPERFICIE_ESCURA = '#0b0e13';
export const SUPERFICIE_CLARA = '#f6f7f9';

/** Tokens derivados injetados como CSS custom properties no <html>. */
export function tokensDeAcento(hex: string): Record<string, string> {
  const seguro = hexValido(hex) ? hex.toLowerCase() : HEX_PADRAO;
  const { r, g, b } = hexParaRgb(seguro);
  return {
    '--acento': seguro,
    '--acento-rgb': `${r} ${g} ${b}`,
    '--acento-texto': corDeTextoSobre(seguro),
    '--acento-escuro': acentoLegivel(seguro, SUPERFICIE_ESCURA),
    '--acento-claro': acentoLegivel(seguro, SUPERFICIE_CLARA),
  };
}

// --------------------------------------------------------------------------
// Sessao por inatividade
// --------------------------------------------------------------------------

export const MINUTOS_INATIVIDADE = [15, 30, 60, 120, 240] as const;
export type MinutosInatividade = (typeof MINUTOS_INATIVIDADE)[number];
export const MINUTOS_PADRAO: MinutosInatividade = 30;

export function ehMinutosValidos(valor: number): valor is MinutosInatividade {
  return (MINUTOS_INATIVIDADE as readonly number[]).includes(valor);
}

export function resolverMinutos(bruto: string | null | undefined): MinutosInatividade {
  const numero = Number.parseInt(bruto ?? '', 10);
  return Number.isFinite(numero) && ehMinutosValidos(numero) ? numero : MINUTOS_PADRAO;
}
