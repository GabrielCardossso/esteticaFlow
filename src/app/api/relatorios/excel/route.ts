import { NextResponse } from 'next/server';
import { carregarContexto, exigirRecurso } from '@/auth/contexto';
import { filtroRelatorioSchema } from '@/schemas';
import { lerQuery, respostaDeErroInesperado, respostaDeFalha } from '@/server/api';
import { gerarPlanilha } from '@/server/exportacao/planilha';
import { montarRelatorio } from '@/server/relatorios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(request: Request) {
  const query = lerQuery(request, filtroRelatorioSchema);
  if (!query.ok) return query.resposta;

  const contexto = await carregarContexto();
  if (!contexto.ok) return respostaDeFalha(contexto.error);

  const acesso = exigirRecurso(contexto.value, 'EXPORTACAO_EXCEL');
  if (!acesso.ok) return respostaDeFalha(acesso.error);

  const relatorio = await montarRelatorio(contexto.value, query.dados);
  if (!relatorio.ok) return respostaDeFalha(relatorio.error);

  try {
    const arquivo = await gerarPlanilha(relatorio.value);
    const nome = `relatorio-${relatorio.value.periodo.inicio}-a-${relatorio.value.periodo.fim}.xlsx`;
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        'Content-Type': TIPO_XLSX,
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (excecao) {
    return respostaDeErroInesperado(excecao);
  }
}
