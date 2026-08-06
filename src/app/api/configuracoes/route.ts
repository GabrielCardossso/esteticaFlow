import { ok } from '@/domain/result';
import { comContexto } from '@/server/api';
import {
  lerPreferencias,
  listarUsuarios,
  solicitacaoPendente,
  ultimosAcessos,
} from '@/server/configuracoes';
import { listarFormasPagamento } from '@/server/financeiro';
import { listarCategoriasProduto } from '@/server/estoque';
import { listarCategoriasServico } from '@/server/servicos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return comContexto(async (contexto) => {
    const usuarios = await listarUsuarios(contexto, true);
    const categoriasServico = await listarCategoriasServico(contexto, true);

    return ok({
      empresa: contexto.empresa,
      preferencias: await lerPreferencias(contexto),
      usuarios: usuarios.ok ? usuarios.value : { usuarios: [], limite: 0, ativos: 0 },
      formasPagamento: contexto.permite('FINANCEIRO')
        ? await listarFormasPagamento(contexto, true)
        : [],
      categoriasProduto: contexto.permite('ESTOQUE')
        ? await listarCategoriasProduto(contexto, true)
        : [],
      categoriasServico: categoriasServico.ok ? categoriasServico.value : [],
      solicitacaoPendente: await solicitacaoPendente(contexto),
      acessos: await ultimosAcessos(contexto, 8),
    });
  });
}
