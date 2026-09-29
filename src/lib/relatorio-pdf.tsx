import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { parseCsvSections, pdfColumns, pesoDaColuna, type CsvSection } from '@/lib/csv-parse'

// Relatório em PDF: a MESMA planilha que o CSV traz, montada para o papel.
// Deitado (A4 landscape) porque tabela em pé não cabe, e com só as colunas que
// identificam o registro — ver `pdfColumns`.

const C = {
  brand: '#1f6e3d',
  texto: '#111827',
  suave: '#6b7280',
  linha: '#d1d5db',
  faixa: '#f3f4f6',
}

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 24, fontSize: 8, color: C.texto },
  titulo: { fontSize: 15, fontWeight: 'bold', color: C.brand },
  subtitulo: { fontSize: 9, color: C.suave, marginTop: 2 },
  cabecalho: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.brand, paddingBottom: 6 },
  secaoTitulo: { fontSize: 11, fontWeight: 'bold', color: C.brand, marginTop: 12, marginBottom: 4 },
  secaoVazia: { fontSize: 9, color: C.suave, marginBottom: 6 },
  linha: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.linha },
  linhaCabecalho: { flexDirection: 'row', backgroundColor: C.faixa, borderBottomWidth: 1, borderBottomColor: C.linha },
  celula: { paddingVertical: 3, paddingHorizontal: 4 },
  celulaCabecalho: { paddingVertical: 4, paddingHorizontal: 4, fontWeight: 'bold', fontSize: 8 },
  rodape: {
    position: 'absolute', bottom: 16, left: 24, right: 24,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 7, color: C.suave,
  },
})

/** Larguras proporcionais ao tipo do campo (ver `pesoDaColuna`). */
function larguras(cabecalhos: string[]): string[] {
  const pesos = cabecalhos.map(pesoDaColuna)
  const soma = pesos.reduce((a, b) => a + b, 0)
  return pesos.map(p => `${(p / soma) * 100}%`)
}

function Tabela({ secao }: { secao: CsvSection }) {
  const colunas = pdfColumns(secao.header)
  const larguraDe = larguras(colunas.map(c => secao.header[c]))

  return (
    <View>
      {secao.title && <Text style={styles.secaoTitulo}>{secao.title}</Text>}
      {secao.rows.length === 0 ? (
        <Text style={styles.secaoVazia}>Nenhum registro.</Text>
      ) : (
        <>
          {/* `fixed` repete o cabeçalho quando a tabela vira a página. */}
          <View style={styles.linhaCabecalho} fixed>
            {colunas.map((c, i) => (
              <Text key={c} style={[styles.celulaCabecalho, { width: larguraDe[i] }]}>
                {secao.header[c]}
              </Text>
            ))}
          </View>
          {secao.rows.map((linha, n) => (
            <View key={n} style={styles.linha} wrap={false}>
              {colunas.map((c, i) => (
                <Text key={c} style={[styles.celula, { width: larguraDe[i] }]}>
                  {linha[c] ?? ''}
                </Text>
              ))}
            </View>
          ))}
        </>
      )}
    </View>
  )
}

export function RelatorioDocument({ titulo, secoes, geradoEm }: {
  titulo: string
  secoes: CsvSection[]
  geradoEm: string
}) {
  const total = secoes.reduce((soma, s) => soma + s.rows.length, 0)

  return (
    <Document title={titulo}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.cabecalho} fixed>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.subtitulo}>
            Sindicato Rural de Terra Roxa · {total} {total === 1 ? 'registro' : 'registros'} · gerado em {geradoEm}
          </Text>
        </View>

        {secoes.map((secao, i) => <Tabela key={secao.title ?? i} secao={secao} />)}

        <View style={styles.rodape} fixed>
          <Text>{titulo} · {geradoEm}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/** Monta o PDF a partir do CSV já baixado e entrega o arquivo. */
export async function saveRelatorioPdf(csv: string, titulo: string, nomeDoArquivo: string): Promise<void> {
  const secoes = parseCsvSections(csv)
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const blob = await pdf(
    <RelatorioDocument titulo={titulo} secoes={secoes} geradoEm={geradoEm} />,
  ).toBlob()
  saveBlob(blob, nomeDoArquivo)
}
