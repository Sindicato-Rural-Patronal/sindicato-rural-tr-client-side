import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { parseCsvSections, pdfColumns, pesoDaColuna, type CsvSection } from '@/lib/csv-parse'
import type { RelatorioColuna, RelatorioJson } from '@/lib/export'

// Relatório em PDF, de dois jeitos:
//   • RelatorioDocument (o "Relatório de cadastros", com 4 tabelas, o PDF
//     rápido de fonte sem catálogo, com o back velho, e o PDF rápido acima do
//     limite de linhas do PDF da API): a MESMA planilha que o CSV traz, montada
//     para o papel. Deitado (A4 landscape) porque tabela em pé não cabe, e com
//     só as colunas que identificam o registro — ver `pdfColumns` — ou as
//     pedidas em `colunas` (as do PDF rápido pela API).
//   • RelatorioJsonDocument (montador e PDF rápido do menu, decisão 006): o
//     JSON da API, só com as colunas escolhidas, na ordem escolhida. A folha e
//     a letra se ajustam ao número de colunas (`layoutDoPdf`). O PDF rápido
//     pede as colunas que `pdfColumns` escolhia (`camposDoResumo`).

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

// ---------------------------------------------------------------------------
// Quebra de palavra nas células
// ---------------------------------------------------------------------------
//
// Sozinho, o react-pdf hifeniza com regras do inglês e quebra palavra que
// caberia inteira na linha de baixo ("Nº de or-/dem", "CRISTI-/NA"). Sem
// hifenizar nada (`Font.registerHyphenationCallback(w => [w])`), a palavra que
// não cabe na coluna (e-mail, nome no PDF de 57 colunas) passa por cima da
// coluna do lado. Por isso cada coluna decide pela sua largura: a palavra que
// cabe não se quebra; a que não cabe é hifenizada como antes. E, no montador,
// cada coluna fica pelo menos da largura da maior palavra do rótulo (e do
// maior valor inteiro das datas, CPFs, telefones e números), para o cabeçalho
// não sair cortado no meio e o telefone não se separar do DDD
// (`fracoesDasColunas`). Vai em cada <Text> (prop `hyphenationCallback`), e não
// no `Font` global, para não mudar os outros PDFs do sistema.

/** Larguras da Helvetica e da Helvetica-Bold (AFM, por 1.000 de letra), do espaço (32) ao til (126). */
const AFM_HELVETICA = (
  '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 '
  + '278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 '
  + '611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 '
  + '556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584'
).split(' ').map(Number)
const AFM_HELVETICA_NEGRITO = (
  '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 '
  + '333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 '
  + '611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 '
  + '611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584'
).split(' ').map(Number)

/** Espaço que não separa: a Helvetica desenha como o espaço, mas o react-pdf não quebra a linha nele. */
const ESPACO_QUE_NAO_SEPARA = String.fromCharCode(0xa0)

/** Largura da palavra em pt, na Helvetica (a letra dos PDFs). Acento não muda a largura. */
export function larguraDaPalavra(palavra: string, fontSize: number, negrito = false): number {
  const tabela = negrito ? AFM_HELVETICA_NEGRITO : AFM_HELVETICA
  let milesimos = 0
  for (const letra of palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) {
    const c = letra.charCodeAt(0)
    // Fora da tabela: o espaço que não separa tem a largura do espaço; º e ª são
    // estreitos; o resto, uma letra larga, para sobrar.
    milesimos += c >= 32 && c <= 126
      ? tabela[c - 32]
      : letra === ESPACO_QUE_NAO_SEPARA ? tabela[0] : letra === 'º' || letra === 'ª' ? 370 : 722
  }
  return (milesimos * fontSize) / 1000
}

/** A maior palavra do texto, em pt. */
function maiorPalavra(texto: string, fontSize: number, negrito = false): number {
  return texto.split(/\s+/).reduce((maior, p) => Math.max(maior, larguraDaPalavra(p, fontSize, negrito)), 0)
}

/** Como o react-pdf passa a hifenização dele (2º argumento, que o tipo não declara). */
type Hifenizar = (palavra: string) => string[]

/**
 * A quebra de palavra de uma coluna com `larguraUtil` pt de texto: a palavra
 * que cabe fica inteira; a que não cabe é hifenizada pelo react-pdf, como antes.
 */
export function quebraDaColuna(larguraUtil: number, fontSize: number, negrito = false) {
  return (palavra: string, hifenizar?: Hifenizar): string[] =>
    larguraDaPalavra(palavra, fontSize, negrito) <= larguraUtil || typeof hifenizar !== 'function'
      ? [palavra]
      : hifenizar(palavra)
}

/** Largura do A4 em pt e as margens da página e da célula (as de `styles`). */
const A4 = { portrait: 595.28, landscape: 841.89 }
const MARGEM_DA_PAGINA = 24
const MARGEM_DA_CELULA = 4

/** Largura da tabela (a página menos as margens). */
function larguraDaTabela(orientation: 'portrait' | 'landscape'): number {
  return A4[orientation] - 2 * MARGEM_DA_PAGINA
}

/** Quanto de texto cabe numa coluna que ocupa `fracao` da largura da tabela. */
export function larguraUtilDaColuna(fracao: number, orientation: 'portrait' | 'landscape'): number {
  return fracao * larguraDaTabela(orientation) - 2 * MARGEM_DA_CELULA
}

/** A quebra de cada coluna, para o cabeçalho (negrito) e para as linhas. */
function quebrasDasColunas(fracoes: number[], orientation: 'portrait' | 'landscape', fontSize: number) {
  return fracoes.map(f => {
    const util = larguraUtilDaColuna(f, orientation)
    return { cabecalho: quebraDaColuna(util, fontSize, true), linha: quebraDaColuna(util, fontSize) }
  })
}

const emPorcento = (fracao: number) => `${fracao * 100}%`

/** Frações da largura proporcionais ao tipo do campo (ver `pesoDaColuna`). */
function fracoesDoCsv(cabecalhos: string[]): number[] {
  const pesos = cabecalhos.map(pesoDaColuna)
  const soma = pesos.reduce((a, b) => a + b, 0)
  return pesos.map(p => p / soma)
}

function Tabela({ secao, rotulos }: { secao: CsvSection; rotulos?: string[] }) {
  const colunas = pdfColumns(secao.header, rotulos)
  const fracoes = fracoesDoCsv(colunas.map(c => secao.header[c]))
  const quebras = quebrasDasColunas(fracoes, 'landscape', 8)

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
              <Text
                key={c}
                style={[styles.celulaCabecalho, { width: emPorcento(fracoes[i]) }]}
                hyphenationCallback={quebras[i].cabecalho}
              >
                {secao.header[c]}
              </Text>
            ))}
          </View>
          {secao.rows.map((linha, n) => (
            <View key={n} style={styles.linha} wrap={false}>
              {colunas.map((c, i) => (
                <Text
                  key={c}
                  style={[styles.celula, { width: emPorcento(fracoes[i]) }]}
                  hyphenationCallback={quebras[i].linha}
                >
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

export function RelatorioDocument({ titulo, secoes, geradoEm, colunas }: {
  titulo: string
  secoes: CsvSection[]
  geradoEm: string
  /** Rótulos das colunas a mostrar, na ordem; sem eles, as de `pdfColumns`. */
  colunas?: string[]
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

        {secoes.map((secao, i) => <Tabela key={secao.title ?? i} secao={secao} rotulos={colunas} />)}

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

/** Monta o PDF a partir do CSV já baixado e entrega o arquivo. `colunas`: ver `RelatorioDocument`. */
export async function saveRelatorioPdf(csv: string, titulo: string, nomeDoArquivo: string, colunas?: string[]): Promise<void> {
  const secoes = parseCsvSections(csv)
  const blob = await pdf(
    <RelatorioDocument titulo={titulo} secoes={secoes} geradoEm={agora()} colunas={colunas} />,
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

/** Fração da largura de cada coluna só pelos pesos: o `weight` dela ou o peso do tipo. */
function fracoesPelosPesos(columns: RelatorioColuna[]): number[] {
  const pesos = columns.map(c => c.weight ?? PESO_DO_TIPO[c.type] ?? 2)
  const soma = pesos.reduce((a, b) => a + b, 0) || 1
  return pesos.map(p => p / soma)
}

/** Larguras em %: o `weight` da coluna ou o peso do tipo. */
export function largurasDasColunas(columns: RelatorioColuna[]): string[] {
  return fracoesPelosPesos(columns).map(emPorcento)
}

/**
 * Tipos de valor curto e formatado (data, data e hora, CPF, telefone, número…):
 * a coluna precisa caber o maior valor inteiro, para "(44) 9991-1096" e
 * "10/11/2026 15:32" não se separarem no espaço.
 */
const VALOR_INTEIRO = new Set(['cpf', 'cnpj', 'cns', 'cep', 'phone', 'date', 'datetime', 'wallclock', 'number', 'money', 'boolean'])

/**
 * Até quantas letras o valor conta como curto. Os formatados têm até 18 (CNPJ,
 * CNS); o que passa disso é um telefone gravado fora do padrão, e esse quebra
 * nos espaços, como texto.
 */
const VALOR_CURTO = 20

/** O valor da célula é de um tipo de `VALOR_INTEIRO` e curto: deve sair inteiro. */
function ehValorInteiro(type: string, valor: string): boolean {
  return VALOR_INTEIRO.has(type) && valor.trim().length <= VALOR_CURTO
}

/** Um respiro, para a conta da largura não ficar no limite. */
const FOLGA = 0.5

/**
 * Largura mínima de cada coluna, em pt: a maior palavra do rótulo (em negrito)
 * e, nos tipos de `VALOR_INTEIRO`, o maior valor inteiro (com `inteiro` false,
 * a maior palavra dos valores, como na SR-092); mais a margem.
 */
export function minimosDasColunas(
  columns: RelatorioColuna[],
  rows: string[][],
  fontSize: number,
  inteiro = true,
): number[] {
  return columns.map((c, i) => {
    let maior = maiorPalavra(c.label, fontSize, true)
    if (VALOR_INTEIRO.has(c.type)) {
      for (const linha of rows) {
        const valor = (linha[i] ?? '').trim()
        const largura = inteiro && ehValorInteiro(c.type, valor)
          ? larguraDaPalavra(valor, fontSize)
          : maiorPalavra(valor, fontSize)
        maior = Math.max(maior, largura)
      }
    }
    return maior + 2 * MARGEM_DA_CELULA + FOLGA
  })
}

/**
 * Fração da largura de cada coluna: pelos pesos, mas nenhuma abaixo do seu
 * mínimo (`minimosDasColunas`). A que ficaria estreita demais fica no mínimo e
 * as outras dividem o resto pelos pesos. O mínimo é o do valor inteiro; se a
 * soma não cabe na folha, o da maior palavra do valor; se nem esse cabe (o
 * Padrão de pessoas, com 57 colunas), fica só pelos pesos, como antes.
 */
export function fracoesDasColunas(
  columns: RelatorioColuna[],
  rows: string[][],
  { orientation, fontSize }: LayoutDoPdf,
): number[] {
  const pesos = fracoesPelosPesos(columns)
  const total = larguraDaTabela(orientation)
  const soma = (larguras: number[]) => larguras.reduce((a, b) => a + b, 0)
  let minimos = minimosDasColunas(columns, rows, fontSize)
  if (soma(minimos) > total) minimos = minimosDasColunas(columns, rows, fontSize, false)
  const somaDosMinimos = soma(minimos)
  if (somaDosMinimos > total) return pesos
  const noMinimo = columns.map(() => false)
  for (;;) {
    const livre = total - minimos.reduce((s, m, i) => s + (noMinimo[i] ? m : 0), 0)
    const somaDosPesos = pesos.reduce((s, p, i) => s + (noMinimo[i] ? 0 : p), 0)
    if (somaDosPesos <= 0) break
    const larguras = pesos.map((p, i) => (noMinimo[i] ? minimos[i] : (p / somaDosPesos) * livre))
    const estreitas = larguras.map((l, i) => !noMinimo[i] && l < minimos[i])
    if (!estreitas.some(Boolean)) return larguras.map(l => l / total)
    estreitas.forEach((e, i) => { if (e) noMinimo[i] = true })
  }
  // Todas no mínimo: a sobra vai para elas, na proporção do mínimo.
  return minimos.map(m => m / somaDosMinimos)
}

/**
 * O texto da célula no desenho do PDF. O valor curto de `VALOR_INTEIRO` que
 * cabe inteiro na coluna troca o espaço pelo que não separa, para não ir em
 * duas linhas ("(44)" / "9991-1096"). O dado não muda, só o desenho. O que não
 * cabe (como no Padrão de 57 colunas) continua quebrando no espaço.
 */
export function textoDaCelula(valor: string, type: string, larguraUtil: number, fontSize: number): string {
  const texto = valor.trim()
  if (!texto.includes(' ') || !ehValorInteiro(type, texto)) return valor
  return larguraDaPalavra(texto, fontSize) <= larguraUtil ? texto.replace(/ /g, ESPACO_QUE_NAO_SEPARA) : valor
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
  const fracoes = fracoesDasColunas(data.columns, data.rows, { orientation, fontSize })
  const largura = fracoes.map(emPorcento)
  const quebras = quebrasDasColunas(fracoes, orientation, fontSize)
  const uteis = fracoes.map(f => larguraUtilDaColuna(f, orientation))
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
                  hyphenationCallback={quebras[i].cabecalho}
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
                    hyphenationCallback={quebras[i].linha}
                  >
                    {textoDaCelula(linha[i] ?? '', c.type, uteis[i], fontSize)}
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
