import moment from 'moment-timezone';
import 'moment/locale/pt-br';

/**
 * Relogio oficial do sistema. Toda leitura de "agora" e toda formatacao passa
 * por aqui, no fuso da operacao. Nenhum modulo deve chamar `new Date()` para
 * decidir regra de negocio.
 */
export const FUSO = 'America/Sao_Paulo';

moment.tz.setDefault(FUSO);
moment.locale('pt-br');

export type EntradaData = Date | string | number | moment.Moment;

/** Momento no fuso da operacao. */
export function m(valor?: EntradaData): moment.Moment {
  return valor === undefined ? moment.tz(FUSO) : moment.tz(valor, FUSO);
}

/** Agora, truncado ao minuto (compara com inputs datetime-local). */
export function agoraNoMinuto(): moment.Moment {
  return m().seconds(0).milliseconds(0);
}

export function agora(): Date {
  return m().toDate();
}

/** Data de hoje no formato ISO (YYYY-MM-DD), no fuso da operacao. */
export function hojeISO(): string {
  return m().format('YYYY-MM-DD');
}

export function inicioDoDia(valor: EntradaData): Date {
  return m(valor).startOf('day').toDate();
}

export function fimDoDia(valor: EntradaData): Date {
  return m(valor).endOf('day').toDate();
}

export function inicioDaSemana(valor: EntradaData): Date {
  return m(valor).startOf('isoWeek').toDate();
}

export function fimDaSemana(valor: EntradaData): Date {
  return m(valor).endOf('isoWeek').toDate();
}

export function inicioDoMes(valor: EntradaData): Date {
  return m(valor).startOf('month').toDate();
}

export function fimDoMes(valor: EntradaData): Date {
  return m(valor).endOf('month').toDate();
}

export function paraISO(valor: EntradaData): string {
  return m(valor).format('YYYY-MM-DD');
}

export function diasEntre(inicio: EntradaData, fim: EntradaData): number {
  return m(fim).startOf('day').diff(m(inicio).startOf('day'), 'days');
}

export function adicionarMinutos(valor: EntradaData, minutos: number): Date {
  return m(valor).add(minutos, 'minutes').toDate();
}

export function adicionarMeses(valor: EntradaData, meses: number): Date {
  return m(valor).add(meses, 'months').toDate();
}

export function ehAnterior(a: EntradaData, b: EntradaData): boolean {
  return m(a).isBefore(m(b));
}

/** Intervalos se sobrepoem quando cada um comeca antes do fim do outro. */
export function haSobreposicao(
  inicioA: EntradaData,
  fimA: EntradaData,
  inicioB: EntradaData,
  fimB: EntradaData,
): boolean {
  return m(inicioA).isBefore(m(fimB)) && m(inicioB).isBefore(m(fimA));
}

// --------------------------------------------------------------------------
// Formatacao para exibicao
// --------------------------------------------------------------------------

export function formatarData(valor: EntradaData | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return m(valor).format('DD/MM/YYYY');
}

export function formatarDataHora(valor: EntradaData | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return m(valor).format('DD/MM/YYYY [às] HH:mm');
}

export function formatarHora(valor: EntradaData | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return m(valor).format('HH:mm');
}

export function formatarDataExtenso(valor: EntradaData | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return m(valor).format('dddd, D [de] MMMM [de] YYYY');
}

export function formatarRelativo(valor: EntradaData | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return m(valor).fromNow();
}

export function formatarMesCurto(valor: EntradaData): string {
  return m(valor).format('MMM/YY');
}

/** Valor para <input type="datetime-local">. */
export function paraInputDataHora(valor: EntradaData): string {
  return m(valor).format('YYYY-MM-DDTHH:mm');
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

export { moment };
