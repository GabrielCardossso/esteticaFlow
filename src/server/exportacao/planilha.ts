import ExcelJS from 'exceljs';
import type { Relatorio } from '@/server/relatorios';
import { CATALOGO_PLANOS } from '@/domain/plano';
import { formatarData } from '@/domain/shared/tempo';

const CABECALHO_FUNDO = 'FF111827';
const CABECALHO_TEXTO = 'FFF59E0B';

function estilizarCabecalho(linha: ExcelJS.Row): void {
  linha.font = { bold: true, color: { argb: CABECALHO_TEXTO }, size: 11 };
  linha.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CABECALHO_FUNDO } };
  linha.alignment = { vertical: 'middle' };
  linha.height = 20;
}

function ajustarColunas(planilha: ExcelJS.Worksheet, larguras: number[]): void {
  larguras.forEach((largura, indice) => {
    planilha.getColumn(indice + 1).width = largura;
  });
}

const FORMATO_MOEDA = 'R$ #,##0.00';

/** Gera o relatorio gerencial em XLSX, com uma aba por dimensao. */
export async function gerarPlanilha(relatorio: Relatorio): Promise<Buffer> {
  const arquivo = new ExcelJS.Workbook();
  arquivo.creator = 'EsteticaFlow';
  arquivo.created = new Date();

  const resumo = arquivo.addWorksheet('Resumo');
  resumo.addRow(['EsteticaFlow — Relatório gerencial']).font = { bold: true, size: 14 };
  resumo.addRow([]);
  resumo.addRow(['Empresa', relatorio.empresa]);
  resumo.addRow(['Plano', CATALOGO_PLANOS[relatorio.plano].nome]);
  resumo.addRow([
    'Período',
    `${formatarData(relatorio.periodo.inicio)} a ${formatarData(relatorio.periodo.fim)}`,
  ]);
  resumo.addRow(['Filtro', relatorio.filtroRotulo]);
  resumo.addRow([]);

  const cabecalhoResumo = resumo.addRow([
    'Receita',
    'Despesa',
    'Saldo',
    'Ticket médio',
    'Atendimentos recebidos',
    'Margem',
  ]);
  estilizarCabecalho(cabecalhoResumo);

  const valores = resumo.addRow([
    Number(relatorio.resumo.receita),
    Number(relatorio.resumo.despesa),
    Number(relatorio.resumo.saldo),
    Number(relatorio.resumo.ticketMedio),
    relatorio.resumo.atendimentosRecebidos,
    relatorio.resumo.margem === null ? '—' : relatorio.resumo.margem / 100,
  ]);
  valores.getCell(1).numFmt = FORMATO_MOEDA;
  valores.getCell(2).numFmt = FORMATO_MOEDA;
  valores.getCell(3).numFmt = FORMATO_MOEDA;
  valores.getCell(4).numFmt = FORMATO_MOEDA;
  valores.getCell(6).numFmt = '0.0%';
  ajustarColunas(resumo, [22, 18, 18, 18, 24, 12]);

  if (!relatorio.detalhado) {
    const aviso = resumo.addRow([]);
    void aviso;
    resumo.addRow(['O detalhamento por lançamento está disponível no plano Pro.']).font = {
      italic: true,
      color: { argb: 'FF6B7280' },
    };
    const buffer = await arquivo.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const servicos = arquivo.addWorksheet('Serviços');
  estilizarCabecalho(servicos.addRow(['Serviço', 'Quantidade', 'Valor total']));
  for (const item of relatorio.rankingServicos) {
    const linha = servicos.addRow([item.nome, item.quantidade, Number(item.valor)]);
    linha.getCell(3).numFmt = FORMATO_MOEDA;
  }
  ajustarColunas(servicos, [40, 14, 18]);

  const receitas = arquivo.addWorksheet('Receitas');
  estilizarCabecalho(receitas.addRow(['Data', 'Descrição', 'Forma de pagamento', 'Valor']));
  for (const item of relatorio.lancamentosReceita) {
    const linha = receitas.addRow([
      formatarData(item.data),
      item.descricao,
      item.forma,
      Number(item.valor),
    ]);
    linha.getCell(4).numFmt = FORMATO_MOEDA;
  }
  ajustarColunas(receitas, [14, 46, 22, 16]);

  const despesas = arquivo.addWorksheet('Despesas');
  estilizarCabecalho(despesas.addRow(['Data', 'Descrição', 'Categoria', 'Valor']));
  for (const item of relatorio.lancamentosDespesa) {
    const linha = despesas.addRow([
      formatarData(item.data),
      item.descricao,
      item.categoria,
      Number(item.valor),
    ]);
    linha.getCell(4).numFmt = FORMATO_MOEDA;
  }
  ajustarColunas(despesas, [14, 46, 18, 16]);

  const atendimentos = arquivo.addWorksheet('Atendimentos');
  estilizarCabecalho(
    atendimentos.addRow(['Data e hora', 'Cliente', 'Veículo', 'Serviços', 'Status', 'Total']),
  );
  for (const item of relatorio.atendimentos) {
    const linha = atendimentos.addRow([
      formatarData(item.dataHora),
      item.cliente,
      item.veiculo,
      item.servicos,
      item.status,
      Number(item.total),
    ]);
    linha.getCell(6).numFmt = FORMATO_MOEDA;
  }
  ajustarColunas(atendimentos, [18, 28, 26, 44, 16, 16]);

  const buffer = await arquivo.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
