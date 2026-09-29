import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'
import type { FinanceTransaction } from '@/hooks/useFinance'
import {
  blocosDoRelatorio, totalDoRelatorio, type BlocoEmpenho,
} from '@/lib/relatorio-empenho'

// "DESPESAS / RELATÓRIO" no formato do sistema antigo do sindicato
// (relatorio_empenho.php): faixa com os dados da entidade e o total, a tira do
// DESCRITIVO com os quatro subtotais, e um bloco por tipo com as despesas.

const C = {
  brand: '#1f6e3d',
  texto: '#111827',
  suave: '#6b7280',
  borda: '#d4d4d8',
  faixa: '#f4f5f4',
  zebra: '#fafafa',
}

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 34, paddingHorizontal: 28, fontSize: 8, color: C.texto },

  // Cabeçalho: entidade à esquerda, "DESPESAS / RELATÓRIO" à direita.
  topo: { flexDirection: 'row', borderWidth: 1, borderColor: C.borda, marginBottom: 10 },
  topoEsq: { flex: 1.15, padding: 10, borderRightWidth: 1, borderRightColor: C.borda },
  topoDir: { flex: 1, backgroundColor: C.faixa },
  entidade: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.brand },
  entidadeLinha: { fontSize: 7, color: C.suave, marginTop: 2 },
  site: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.brand, marginTop: 5 },
  tituloRel: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.brand, textAlign: 'center', paddingVertical: 10 },
  caixasTopo: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.borda },
  caixaTopo: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  caixaTopoDiv: { borderLeftWidth: 1, borderLeftColor: C.borda },
  caixaRotulo: { fontSize: 6.5, color: C.suave, fontFamily: 'Helvetica-Bold' },
  caixaValor: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  // Tira "DESCRITIVO" + os quatro subtotais.
  descritivo: {
    backgroundColor: C.brand, paddingVertical: 4,
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center',
  },
  resumo: { flexDirection: 'row', borderWidth: 1, borderColor: C.borda, borderTopWidth: 0, marginBottom: 14 },
  resumoItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', paddingVertical: 6 },
  resumoDiv: { borderLeftWidth: 1, borderLeftColor: C.borda },
  resumoRotulo: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.brand },
  resumoValor: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginLeft: 4 },

  // Blocos.
  blocoTitulo: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.brand,
    textAlign: 'center', marginTop: 10, marginBottom: 5,
  },
  vazio: { fontSize: 7.5, color: C.suave, textAlign: 'center', marginBottom: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6 },
  linhaZebra: { backgroundColor: C.zebra },
  cMoeda: { width: 16, color: C.brand, fontSize: 9, textAlign: 'center' },
  cNumero: { width: 34, fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  cData: { width: 52, fontSize: 6.5, color: C.suave },
  cNome: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 7.5, paddingRight: 6 },
  cValor: { width: 62, fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'right' },
  cSituacao: { width: 88, fontSize: 6.5, color: C.suave, textAlign: 'right' },
  blocoTotal: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: C.borda, paddingTop: 4, marginTop: 2, paddingHorizontal: 6,
  },
  blocoTotalTexto: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.brand },

  rodape: {
    position: 'absolute', bottom: 16, left: 28, right: 28,
    flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: C.suave,
  },
})

/** Valor sem o "R$" — o cabeçalho já diz que a coluna é dinheiro. */
function valor(cents: number): string {
  return centsToBRL(cents).replace('R$', '').trim()
}

export type DadosEntidade = {
  nome: string
  cnpj: string
  endereco: string
  cepCidade: string
  telefone: string
  site: string
}

function Bloco({ bloco }: { bloco: BlocoEmpenho }) {
  return (
    <View>
      <Text style={styles.blocoTitulo}>{bloco.label}</Text>
      {bloco.linhas.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma despesa neste tipo.</Text>
      ) : (
        <>
          {bloco.linhas.map((l, i) => (
            <View key={l.id} style={[styles.linha, ...(i % 2 === 1 ? [styles.linhaZebra] : [])]} wrap={false}>
              <Text style={styles.cMoeda}>$</Text>
              <Text style={styles.cNumero}>{l.numero}</Text>
              <Text style={styles.cData}>{formatDateFromString(l.date.slice(0, 10))}</Text>
              <Text style={styles.cNome}>{l.nome}</Text>
              <Text style={styles.cValor}>{valor(l.amountCents)}</Text>
              <Text style={styles.cSituacao}>{l.situacao}</Text>
            </View>
          ))}
          <View style={styles.blocoTotal}>
            <Text style={styles.blocoTotalTexto}>Total {bloco.label}: {centsToBRL(bloco.totalCents)}</Text>
          </View>
        </>
      )}
    </View>
  )
}

export function RelatorioEmpenhoDocument({ entidade, blocos, de, ate }: {
  entidade: DadosEntidade
  blocos: BlocoEmpenho[]
  de: string
  ate: string
}) {
  const total = totalDoRelatorio(blocos)
  const periodo = `${formatDateFromString(de)} A ${formatDateFromString(ate)}`

  return (
    <Document title={`Despesas ${periodo}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topo} fixed>
          <View style={styles.topoEsq}>
            <Text style={styles.entidade}>{entidade.nome}</Text>
            {entidade.cnpj !== '' && <Text style={styles.entidadeLinha}>CNPJ {entidade.cnpj}</Text>}
            <Text style={styles.entidadeLinha}>{entidade.endereco}</Text>
            <Text style={styles.entidadeLinha}>{entidade.cepCidade}</Text>
            <Text style={styles.entidadeLinha}>Telefone: {entidade.telefone}</Text>
            <Text style={styles.site}>{entidade.site}</Text>
          </View>
          <View style={styles.topoDir}>
            <Text style={styles.tituloRel}>DESPESAS / RELATÓRIO</Text>
            <View style={styles.caixasTopo}>
              <View style={styles.caixaTopo}>
                <Text style={styles.caixaRotulo}>MÊS DE REFERÊNCIA</Text>
                <Text style={styles.caixaValor}>{periodo}</Text>
              </View>
              <View style={[styles.caixaTopo, styles.caixaTopoDiv]}>
                <Text style={styles.caixaRotulo}>TOTAL</Text>
                <Text style={styles.caixaValor}>{centsToBRL(total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.descritivo}>DESCRITIVO</Text>
        <View style={styles.resumo}>
          {blocos.map((b, i) => (
            <View key={b.grupo} style={[styles.resumoItem, ...(i > 0 ? [styles.resumoDiv] : [])]}>
              <Text style={styles.resumoRotulo}>{b.label} ·</Text>
              <Text style={styles.resumoValor}>{centsToBRL(b.totalCents)}</Text>
            </View>
          ))}
        </View>

        {blocos.map(bloco => <Bloco key={bloco.grupo} bloco={bloco} />)}

        <View style={styles.rodape} fixed>
          <Text>{entidade.nome} · Despesas {periodo}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function downloadRelatorioEmpenhoPdf(
  transacoes: readonly FinanceTransaction[],
  entidade: DadosEntidade,
  range: { from: string; to: string },
): Promise<void> {
  const blocos = blocosDoRelatorio(transacoes)
  const blob = await pdf(
    <RelatorioEmpenhoDocument entidade={entidade} blocos={blocos} de={range.from} ate={range.to} />,
  ).toBlob()
  saveBlob(blob, `despesas-${range.from}-a-${range.to}.pdf`)
}
