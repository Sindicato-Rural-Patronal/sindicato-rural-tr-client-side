import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'
import type { FinanceTransaction } from '@/hooks/useFinance'
import type { DadosEntidade } from '@/lib/relatorio-empenho-pdf'
import {
  blocosDeReceitas, nomeDoArquivoReceitas, totalDeReceitas, type BlocoReceita,
} from '@/lib/relatorio-receitas'

// "RECEITAS / RELATÓRIO" (SR-140): o espelho do relatório de despesas, no mesmo
// papel (cabeçalho da entidade, faixa DESCRITIVO), com as entradas por categoria.

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

  descritivo: {
    backgroundColor: C.brand, paddingVertical: 4,
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center',
  },
  resumo: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderWidth: 1, borderColor: C.borda, borderTopWidth: 0, marginBottom: 14,
  },
  resumoItem: { width: '33.33%', flexDirection: 'row', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 4 },
  resumoRotulo: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.brand },
  resumoValor: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginLeft: 4 },

  blocoTitulo: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.brand,
    textAlign: 'center', marginTop: 10, marginBottom: 5,
  },
  vazio: { fontSize: 9, color: C.suave, textAlign: 'center', marginTop: 12 },
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: C.borda,
  },
  cabecalhoTexto: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.suave },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6 },
  linhaZebra: { backgroundColor: C.zebra },
  cNumero: { width: 32, fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  cData: { width: 46, fontSize: 6.5, color: C.suave },
  cNome: { flex: 1.3, fontFamily: 'Helvetica-Bold', fontSize: 7, paddingRight: 6 },
  cDocumento: { width: 76, fontSize: 6.5, color: C.suave, paddingRight: 4 },
  cDescricao: { flex: 1.2, fontSize: 7, paddingRight: 6 },
  cForma: { width: 74, fontSize: 6.5, color: C.suave, paddingRight: 4 },
  cValor: { width: 58, fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'right' },
  blocoTotal: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: C.borda, paddingTop: 4, marginTop: 2, paddingHorizontal: 6,
  },
  blocoTotalTexto: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.brand },
  totalGeral: {
    flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16,
    backgroundColor: C.faixa, borderWidth: 1, borderColor: C.borda, paddingVertical: 6, paddingHorizontal: 8,
  },
  totalGeralTexto: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.brand },

  rodape: {
    position: 'absolute', bottom: 16, left: 28, right: 28,
    flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: C.suave,
  },
})

/** Valor sem o "R$" — o cabeçalho já diz que a coluna é dinheiro. */
function valor(cents: number): string {
  return centsToBRL(cents).replace('R$', '').trim()
}

function Bloco({ bloco }: { bloco: BlocoReceita }) {
  return (
    <View>
      <Text style={styles.blocoTitulo} minPresenceAhead={50}>{bloco.label}</Text>
      <View style={styles.cabecalho} wrap={false}>
        <Text style={[styles.cabecalhoTexto, styles.cNumero]}>Nº</Text>
        <Text style={[styles.cabecalhoTexto, styles.cData]}>Data</Text>
        <Text style={[styles.cabecalhoTexto, styles.cNome]}>Nome / Razão social</Text>
        <Text style={[styles.cabecalhoTexto, styles.cDocumento]}>CNPJ / CPF</Text>
        <Text style={[styles.cabecalhoTexto, styles.cDescricao]}>Descrição</Text>
        <Text style={[styles.cabecalhoTexto, styles.cForma]}>Forma de pagamento</Text>
        <Text style={[styles.cabecalhoTexto, styles.cValor]}>Valor (R$)</Text>
      </View>
      {bloco.linhas.map((l, i) => (
        <View key={l.id} style={[styles.linha, ...(i % 2 === 1 ? [styles.linhaZebra] : [])]} wrap={false}>
          <Text style={styles.cNumero}>{l.numero}</Text>
          <Text style={styles.cData}>{formatDateFromString(l.date.slice(0, 10))}</Text>
          <Text style={styles.cNome}>{l.nome}</Text>
          <Text style={styles.cDocumento}>{l.documento}</Text>
          <Text style={styles.cDescricao}>{l.descricao}</Text>
          <Text style={styles.cForma}>{l.forma}</Text>
          <Text style={styles.cValor}>{valor(l.amountCents)}</Text>
        </View>
      ))}
      <View style={styles.blocoTotal} wrap={false}>
        <Text style={styles.blocoTotalTexto}>Subtotal {bloco.label}: {centsToBRL(bloco.totalCents)}</Text>
      </View>
    </View>
  )
}

export function RelatorioReceitasDocument({ entidade, blocos, de, ate }: {
  entidade: DadosEntidade
  blocos: BlocoReceita[]
  de: string
  ate: string
}) {
  const total = totalDeReceitas(blocos)
  const periodo = `${formatDateFromString(de)} A ${formatDateFromString(ate)}`

  return (
    <Document title={`Receitas ${periodo}`}>
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
            <Text style={styles.tituloRel}>RECEITAS / RELATÓRIO</Text>
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

        {blocos.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma receita no período.</Text>
        ) : (
          <>
            <Text style={styles.descritivo}>DESCRITIVO</Text>
            <View style={styles.resumo}>
              {blocos.map(b => (
                <View key={b.chave} style={styles.resumoItem}>
                  <Text style={styles.resumoRotulo}>{b.label} ·</Text>
                  <Text style={styles.resumoValor}>{centsToBRL(b.totalCents)}</Text>
                </View>
              ))}
            </View>

            {blocos.map(bloco => <Bloco key={bloco.chave} bloco={bloco} />)}

            <View style={styles.totalGeral} wrap={false}>
              <Text style={styles.totalGeralTexto}>TOTAL GERAL: {centsToBRL(total)}</Text>
            </View>
          </>
        )}

        <View style={styles.rodape} fixed>
          <Text>{entidade.nome} · Receitas {periodo}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function downloadRelatorioReceitasPdf(
  transacoes: readonly FinanceTransaction[],
  entidade: DadosEntidade,
  range: { from: string; to: string },
): Promise<void> {
  const blocos = blocosDeReceitas(transacoes)
  const blob = await pdf(
    <RelatorioReceitasDocument entidade={entidade} blocos={blocos} de={range.from} ate={range.to} />,
  ).toBlob()
  saveBlob(blob, nomeDoArquivoReceitas(range.from, range.to))
}
