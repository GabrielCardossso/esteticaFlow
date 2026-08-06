import { dadosEmpresaSchema } from '@/schemas';
import { comContexto, lerCorpo } from '@/server/api';
import { descreverPedido, solicitarAlteracaoCadastral } from '@/server/configuracoes';
import { avisarPlataformaSobreSolicitacao } from '@/server/empresas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await lerCorpo(request, dadosEmpresaSchema);
  if (!corpo.ok) return corpo.resposta;

  return comContexto(async (contexto) => {
    const resultado = await solicitarAlteracaoCadastral(contexto, corpo.dados);
    if (resultado.ok) {
      await avisarPlataformaSobreSolicitacao(
        resultado.value.id,
        contexto.empresa.nomeFantasia,
        descreverPedido(contexto.empresa, corpo.dados),
      );
    }
    return resultado;
  }, 201);
}
