import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { parseCsvSections, pdfColumns, pesoDaColuna, type CsvSection } from '@/lib/csv-parse'
import type { RelatorioColuna, RelatorioJson } from '@/lib/export'

// Relatório em PDF, de dois jeitos:
//   • RelatorioDocument (itens rápidos do menu): a MESMA planilha que o CSV
//     traz, montada para o papel. Deitado (A4 landscape) porque tabela em pé
//     não cabe, e com só as colunas que identificam o registro — ver `pdfColumns`.
//   • RelatorioJsonDocument (montador, decisão 006): o JSON da API, só com as
//     colunas escolhidas, na ordem escolhida. A folha e a letra se ajustam ao
//     número de colunas (`layoutDoPdf`).

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

function agora(): string {
  return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Monta o PDF a partir do CSV já baixado e entrega o arquivo. */
export async function saveRelatorioPdf(csv: string, titulo: string, nomeDoArquivo: string): Promise<void> {
  const secoes = parseCsvSections(csv)
  const blob = await pdf(
    <RelatorioDocument titulo={titulo} secoes={secoes} geradoEm={agora()} />,
  ).toBlob()
  saveBlob(blob, nomeDoArquivo)
}

// ---------------------------------------------------------------------------
// Relatório do montador: o JSON da API (decisão 006)
// ---------------------------------------------------------------------------

export type LayoutDoPdf = { orientation: 'portrait' | 'landscape'; fontSize: 8 | 7 | 6 }

/**
 * Até 5 colunas a folha fica em pé; com mais, deitada. A letra é de 8 pt até 8
 * colunas, 7 pt até 12 e 6 pt acima disso (decisão 006, item 4).
 */
export function layoutDoPdf(colunas: number): LayoutDoPdf {
  return {
    orientation: colunas <= 5 ? 'portrait' : 'landscape',
    fontSize: colunas <= 8 ? 8 : colunas <= 12 ? 7 : 6,
  }
}

/** Largura relativa de cada tipo, quando a coluna não traz `weight`. */
const PESO_DO_TIPO: Record<string, number> = {
  text: 2,
  list: 2.5,
  blank: 3,
  cpf: 1.4,
  cnpj: 1.7,
  cns: 1.7,
  phone: 1.4,
  cep: 1,
  date: 1,
  datetime: 1.4,
  wallclock: 1.4,
  number: 0.7,
  money: 1.1,
  boolean: 0.8,
}

/** Larguras em %: o `weight` da coluna ou o peso do tipo. */
export function largurasDasColunas(columns: RelatorioColuna[]): string[] {
  const pesos = columns.map(c => c.weight ?? PESO_DO_TIPO[c.type] ?? 2)
  const soma = pesos.reduce((a, b) => a + b, 0) || 1
  return pesos.map(p => `${(p / soma) * 100}%`)
}

/**
 * Linha do cabeçalho com o modelo e os filtros (vazio = não aparece). A seleção
 * já vem dita pela API ("Seleção: 8 registros") e não leva "Filtros:".
 */
export function linhaDoModeloEFiltros(data: Pick<RelatorioJson, 'modelo' | 'filters'>): string | null {
  const filtros = data.filters
    ? (/^Seleção\b/.test(data.filters) ? data.filters : `Filtros: ${data.filters}`)
    : null
  const partes = [data.modelo ? `Modelo: ${data.modelo}` : null, filtros].filter(Boolean)
  return partes.length ? partes.join(' · ') : null
}

const ALINHA_DIREITA = new Set(['number', 'money'])

export function RelatorioJsonDocument({ data, geradoEm }: { data: RelatorioJson; geradoEm: string }) {
  const { orientation, fontSize } = layoutDoPdf(data.columns.length)
  const largura = largurasDasColunas(data.columns)
  const modeloEFiltros = linhaDoModeloEFiltros(data)
  // Coluna de assinatura (tipo "blank"): a linha precisa de altura para assinar.
  const comAssinatura = data.columns.some(c => c.type === 'blank')
  const total = data.count

  return (
    <Document title={data.title}>
      <Page size="A4" orientation={orientation} style={[styles.page, { fontSize }]}>
        <View style={styles.cabecalho} fixed>
          <Text style={styles.titulo}>{data.title}</Text>
          <Text style={styles.subtitulo}>
            Sindicato Rural de Terra Roxa · {total} {total === 1 ? 'registro' : 'registros'} · gerado em {geradoEm}
          </Text>
          {modeloEFiltros && <Text style={styles.subtitulo}>{modeloEFiltros}</Text>}
        </View>

        {data.rows.length === 0 ? (
          <Text style={styles.secaoVazia}>Nenhum registro.</Text>
        ) : (
          <View>
            {/* `fixed` repete o cabeçalho da tabela em cada página. */}
            <View style={styles.linhaCabecalho} fixed>
              {data.columns.map((c, i) => (
                <Text
                  key={c.key}
                  style={[styles.celulaCabecalho, { width: largura[i], fontSize }, ALINHA_DIREITA.has(c.type) ? { textAlign: 'right' } : {}]}
                >
                  {c.label}
                </Text>
              ))}
            </View>
            {data.rows.map((linha, n) => (
              <View key={n} style={[styles.linha, comAssinatura ? { minHeight: 22 } : {}]} wrap={false}>
                {data.columns.map((c, i) => (
                  <Text
                    key={c.key}
                    style={[styles.celula, { width: largura[i] }, ALINHA_DIREITA.has(c.type) ? { textAlign: 'right' } : {}]}
                  >
                    {linha[i] ?? ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.rodape} fixed>
          <Text>{data.title} · {geradoEm}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/** Desenha o PDF do montador. Quem chama decide se baixa ou abre para imprimir. */
export async function relatorioJsonPdf(data: RelatorioJson): Promise<Blob> {
  return pdf(<RelatorioJsonDocument data={data} geradoEm={agora()} />).toBlob()
}
