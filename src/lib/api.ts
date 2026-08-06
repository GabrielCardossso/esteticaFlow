import axios, { AxiosError, type AxiosInstance } from 'axios';

export interface ErroDaApi {
  codigo: string;
  mensagem: string;
  campo?: string;
  detalhes?: { issues?: Array<{ campo: string; mensagem: string }> } & Record<string, unknown>;
}

export class FalhaDaApi extends Error {
  readonly codigo: string;
  readonly campo: string | undefined;
  readonly status: number;
  readonly issues: Array<{ campo: string; mensagem: string }>;

  constructor(erro: ErroDaApi, status: number) {
    super(erro.mensagem);
    this.name = 'FalhaDaApi';
    this.codigo = erro.codigo;
    this.campo = erro.campo;
    this.status = status;
    this.issues = erro.detalhes?.issues ?? [];
  }

  get exigeConfirmacao(): boolean {
    return this.codigo === 'CONFIRMACAO_NECESSARIA';
  }

  get exigeUpgrade(): boolean {
    return this.codigo === 'RECURSO_DO_PLANO';
  }
}

function criarCliente(): AxiosInstance {
  const instancia = axios.create({
    baseURL: '/api',
    withCredentials: true,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  instancia.interceptors.response.use(
    (resposta) => resposta,
    (erro: unknown) => {
      if (erro instanceof AxiosError) {
        const status = erro.response?.status ?? 0;
        const corpo = erro.response?.data as { erro?: ErroDaApi } | undefined;

        if (status === 401 && typeof window !== 'undefined') {
          const atual = window.location.pathname;
          if (!atual.startsWith('/login')) {
            window.location.href = `/login?proximo=${encodeURIComponent(atual)}`;
          }
        }

        if (corpo?.erro !== undefined) {
          return Promise.reject(new FalhaDaApi(corpo.erro, status));
        }

        return Promise.reject(
          new FalhaDaApi(
            {
              codigo: 'REDE',
              mensagem:
                status === 0
                  ? 'Sem conexão com o servidor. Verifique sua internet.'
                  : 'Não foi possível concluir a operação.',
            },
            status,
          ),
        );
      }
      return Promise.reject(erro instanceof Error ? erro : new Error('Erro desconhecido.'));
    },
  );

  return instancia;
}

export const api = criarCliente();

/** Extrai a mensagem de erro pronta para exibição, venha de onde vier. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof FalhaDaApi) return erro.message;
  if (erro instanceof Error) return erro.message;
  return 'Não foi possível concluir a operação.';
}

type ParamValor = string | number | boolean | undefined | null;

/** Monta query string ignorando valores vazios. */
export function paramsLimpos(valores: Record<string, ParamValor>): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === undefined || valor === null || valor === '') continue;
    saida[chave] = String(valor);
  }
  return saida;
}
