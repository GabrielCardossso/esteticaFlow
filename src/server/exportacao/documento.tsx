import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Relatorio } from '@/server/relatorios';
import { formatarData } from '@/domain/shared/tempo';
import { formatarMoeda } from '@/domain/shared/texto';

const cores = {
  tinta: '#0f172a',
  suave: '#64748b',
  borda: '#e2e8f0',
  faixa: '#f8fafc',
  acento: '#b45309',
};

const estilos = StyleSheet.create({
  pagina: { padding: 28, fontSize: 9, color: cores.tinta, fontFamily: 'Helvetica' },
  marca: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: cores.tinta },
  subtitulo: { fontSize: 9, color: cores.suave, marginTop: 2 },
  faixaTopo: {
    borderBottomWidth: 2,
    borderBottomColor: cores.acento,
    paddingBottom: 8,
    marginBottom: 14,
  },
  secao: { marginTop: 16 },
  tituloSecao: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: cores.tinta,
  },
  gradeIndicadores: { flexDirection: 'row', gap: 8, marginTop: 4 },
  indicador: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 4,
    padding: 8,
  },
  rotuloIndicador: { fontSize: 7, color: cores.suave, textTransform: 'uppercase' },
  valorIndicador: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  linha: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: cores.borda },
  linhaAlternada: { backgroundColor: cores.faixa },
  cabecalho: { backgroundColor: cores.tinta },
  celula: { padding: 5, fontSize: 8 },
  celulaCabecalho: { padding: 5, fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  direita: { textAlign: 'right' },
  rodape: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: cores.suave,
    textAlign: 'center',
  },
  aviso: { fontSize: 8, color: cores.suave, fontStyle: 'italic', marginTop: 8 },
});

interface Coluna {
  titulo: string;
  largura: number;
  direita?: boolean;
}

function Tabela({ colunas, linhas }: { colunas: Coluna[]; linhas: string[][] }) {
  return (
    <View>
      <View style={[estilos.linha, estilos.cabecalho]}>
        {colunas.map((coluna) => (
          <Text
            key={coluna.titulo}
            style={[
              estilos.celulaCabecalho,
              { width: `${coluna.largura}%` },
              ...(coluna.direita === true ? [estilos.direita] : []),
            ]}
          >
            {coluna.titulo}
          </Text>
        ))}
      </View>
      {linhas.map((linha, indice) => (
        <View
          key={`${linha[0] ?? ''}-${indice}`}
          style={[estilos.linha, ...(indice % 2 === 1 ? [estilos.linhaAlternada] : [])]}
        >
          {colunas.map((coluna, coluna_indice) => (
            <Text
              key={coluna.titulo}
              style={[
                estilos.celula,
                { width: `${coluna.largura}%` },
                ...(coluna.direita === true ? [estilos.direita] : []),
              ]}
            >
              {linha[coluna_indice] ?? ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function DocumentoRelatorio({ relatorio }: { relatorio: Relatorio }) {
  const periodo = `${formatarData(relatorio.periodo.inicio)} a ${formatarData(relatorio.periodo.fim)}`;

  return (
    <Document
      title={`Relatório EsteticaFlow — ${relatorio.empresa}`}
      author="EsteticaFlow"
      language="pt-BR"
    >
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.faixaTopo}>
          <Text style={estilos.marca}>EsteticaFlow · Relatório gerencial</Text>
          <Text style={estilos.subtitulo}>
            {relatorio.empresa} · Plano {relatorio.plano} · {relatorio.filtroRotulo} · {periodo}
          </Text>
        </View>

        <View style={estilos.gradeIndicadores}>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Receita</Text>
            <Text style={estilos.valorIndicador}>{formatarMoeda(relatorio.resumo.receita)}</Text>
          </View>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Despesa</Text>
            <Text style={estilos.valorIndicador}>{formatarMoeda(relatorio.resumo.despesa)}</Text>
          </View>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Saldo</Text>
            <Text style={estilos.valorIndicador}>{formatarMoeda(relatorio.resumo.saldo)}</Text>
          </View>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Ticket médio</Text>
            <Text style={estilos.valorIndicador}>
              {formatarMoeda(relatorio.resumo.ticketMedio)}
            </Text>
          </View>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Atendimentos recebidos</Text>
            <Text style={estilos.valorIndicador}>{relatorio.resumo.atendimentosRecebidos}</Text>
          </View>
          <View style={estilos.indicador}>
            <Text style={estilos.rotuloIndicador}>Margem</Text>
            <Text style={estilos.valorIndicador}>
              {relatorio.resumo.margem === null ? '—' : `${relatorio.resumo.margem}%`}
            </Text>
          </View>
        </View>

        {!relatorio.detalhado ? (
          <Text style={estilos.aviso}>
            O detalhamento por lançamento está disponível no plano Pro.
          </Text>
        ) : (
          <>
            {relatorio.rankingServicos.length > 0 ? (
              <View style={estilos.secao}>
                <Text style={estilos.tituloSecao}>Serviços mais executados</Text>
                <Tabela
                  colunas={[
                    { titulo: 'Serviço', largura: 60 },
                    { titulo: 'Quantidade', largura: 20, direita: true },
                    { titulo: 'Valor', largura: 20, direita: true },
                  ]}
                  linhas={relatorio.rankingServicos.map((item) => [
                    item.nome,
                    String(item.quantidade),
                    formatarMoeda(item.valor),
                  ])}
                />
              </View>
            ) : null}

            {relatorio.atendimentos.length > 0 ? (
              <View style={estilos.secao}>
                <Text style={estilos.tituloSecao}>Atendimentos do período</Text>
                <Tabela
                  colunas={[
                    { titulo: 'Data', largura: 12 },
                    { titulo: 'Cliente', largura: 22 },
                    { titulo: 'Veículo', largura: 20 },
                    { titulo: 'Serviços', largura: 26 },
                    { titulo: 'Status', largura: 10 },
                    { titulo: 'Total', largura: 10, direita: true },
                  ]}
                  linhas={relatorio.atendimentos.map((item) => [
                    formatarData(item.dataHora),
                    item.cliente,
                    item.veiculo,
                    item.servicos,
                    item.status,
                    formatarMoeda(item.total),
                  ])}
                />
              </View>
            ) : null}
          </>
        )}

        <Text
          style={estilos.rodape}
          render={({ pageNumber, totalPages }) =>
            `EsteticaFlow · gerado em ${formatarData(new Date())} · página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function gerarPdf(relatorio: Relatorio): Promise<Buffer> {
  return renderToBuffer(<DocumentoRelatorio relatorio={relatorio} />);
}
