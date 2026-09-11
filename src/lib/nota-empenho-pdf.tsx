import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { centsToBRL } from '@/utils/masks'
import { valorPorExtenso } from '@/utils/extenso'
import type { Empenho } from '@/hooks/useFinance'

// A nota precisa só destes campos do lançamento.
export type NotaData = {
  amountCents: number
  date: string
  description: string
  empenho: Empenho | null
}

const SINDICATO = 'SINDICATO RURAL DE TERRA ROXA'
const CIDADE_UF = 'TERRA ROXA / PR'
// Assinaturas institucionais (dirigentes do sindicato).
const SIGNATORIES = [
  { name: 'OSVAIR MAURO FRASSON', role: 'EXECUTIVO' },
  { name: 'FERNANDO VOLPATO MARQUES', role: 'PRESIDENTE' },
  { name: 'ADEMIR FERREIRA DE PÁDUA', role: 'FINANCEIRO' },
]

const C = { text: '#111', muted: '#555', line: '#999', border: '#333' }

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', color: C.text, fontSize: 9 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  brand: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  docTitle: { fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 1 },
  metaBox: { alignItems: 'flex-end' },
  metaLine: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  metaLabel: { fontSize: 8, color: C.muted },
  metaValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },

  box: { borderWidth: 1, borderColor: C.border, borderStyle: 'solid', padding: 8, marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 6 },
  field: { paddingRight: 8 },
  label: { fontSize: 6.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginTop: 1 },

  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, paddingHorizontal: 4 },
  valueBig: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  extenso: { fontSize: 8, fontFamily: 'Helvetica-Bold', maxWidth: 200, textAlign: 'right' },

  descricao: { textAlign: 'center', fontSize: 10, fontFamily: 'Helvetica-Bold', marginVertical: 18, paddingHorizontal: 20 },

  quita: { fontSize: 9, textAlign: 'center', lineHeight: 1.5, marginBottom: 4, paddingHorizontal: 10 },
  local: { fontSize: 9, textAlign: 'center', fontFamily: 'Helvetica-Bold', marginBottom: 30 },

  supSign: { alignItems: 'center', marginBottom: 40 },
  supLine: { borderTopWidth: 1, borderColor: C.line, width: 240, marginBottom: 3 },
  supName: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  signRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  signCol: { width: '30%', alignItems: 'center' },
  signColLine: { borderTopWidth: 1, borderColor: C.line, width: '100%', marginBottom: 3 },
  signName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  signRole: { fontSize: 7.5, color: C.muted },

  footer: { borderTopWidth: 1, borderColor: C.border, paddingTop: 8, marginTop: 'auto' },
  footRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' },
  footItem: { flexDirection: 'row', gap: 4, alignItems: 'baseline' },
  footLabel: { fontSize: 8, color: C.muted, textTransform: 'uppercase' },
  footValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  nfCenter: { textAlign: 'center', marginBottom: 8, fontSize: 9.5 },
})

function Field({ label, value, width }: { label: string; value?: string; width?: number | string }) {
  return (
    <View style={[styles.field, width ? { width } : {}]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || ' '}</Text>
    </View>
  )
}

export function NotaEmpenhoDocument({ tx }: { tx: NotaData }) {
  const e = tx.empenho ?? {}
  const liquidoCents = tx.amountCents
  const descontoCents = e.descontoCents ?? 0
  const brutoCents = liquidoCents + descontoCents
  const dataFmt = formatDateFromString(tx.date.slice(0, 10))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{SINDICATO}</Text>
            <Text style={styles.docTitle}>NOTA DE EMPENHO</Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>DATA</Text>
              <Text style={styles.metaValue}>{dataFmt}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Nº</Text>
              <Text style={styles.metaValue}>{e.numero || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Fornecedor */}
        <View style={styles.box}>
          <View style={styles.row}>
            <Field label="Nome fantasia" value={e.nomeFantasia} width="40%" />
            <Field label="Endereço" value={e.endereco} width="35%" />
            <Field label="Bairro" value={e.bairro} width="15%" />
            <Field label="CEP" value={e.cep} width="10%" />
          </View>
          <View style={styles.row}>
            <Field label="Razão social" value={e.razaoSocial} width="40%" />
            <Field label="Cidade" value={e.cidade} width="35%" />
            <Field label="UF" value={e.uf} width="10%" />
            <Field label="Telefone" value={e.telefone} width="15%" />
          </View>
          <View style={styles.row}>
            <Field label="CNPJ / CPF" value={e.cnpjCpf} width="40%" />
            <Field label="Inscrição estadual" value={e.inscricaoEstadual} width="60%" />
          </View>
        </View>

        {/* Valores */}
        <View style={styles.valuesRow}>
          <View>
            <Text style={styles.label}>VALOR BRUTO</Text>
            <Text style={styles.valueBig}>{centsToBRL(brutoCents)}</Text>
          </View>
          <View>
            <Text style={styles.label}>DESCONTO</Text>
            <Text style={styles.valueBig}>{centsToBRL(descontoCents)}</Text>
          </View>
          <View>
            <Text style={styles.label}>VALOR LÍQUIDO</Text>
            <Text style={styles.valueBig}>{centsToBRL(liquidoCents)}</Text>
          </View>
          <Text style={styles.extenso}>{valorPorExtenso(liquidoCents)}</Text>
        </View>

        {/* Descrição */}
        <Text style={styles.descricao}>{tx.description}</Text>

        {/* Quitação */}
        <Text style={styles.quita}>
          RECEBI (EMOS) DA TESOURARIA DO {SINDICATO} / PR, A IMPORTÂNCIA DE{' '}
          {centsToBRL(liquidoCents)} - {valorPorExtenso(liquidoCents)}, CONSTANTE DESTA NOTA DE EMPENHO.
          DA QUAL PASSO (AMOS) A PRESENTE QUITAÇÃO.
        </Text>
        <Text style={styles.local}>{CIDADE_UF}, {dataFmt}</Text>

        {/* Assinatura do fornecedor */}
        <View style={styles.supSign}>
          <View style={styles.supLine} />
          <Text style={styles.supName}>{e.nomeFantasia || e.razaoSocial || 'FORNECEDOR'}</Text>
        </View>

        {/* Assinaturas do sindicato */}
        <View style={styles.signRow}>
          {SIGNATORIES.map(s => (
            <View key={s.role} style={styles.signCol}>
              <View style={styles.signColLine} />
              <Text style={styles.signName}>{s.name}</Text>
              <Text style={styles.signRole}>{s.role}</Text>
            </View>
          ))}
        </View>

        {/* Rodapé: NF + banco */}
        <View style={styles.footer}>
          <Text style={styles.nfCenter}>
            NOTA FISCAL Nº <Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.notaFiscal || '—'}</Text>
          </Text>
          <View style={styles.footRow}>
            <View style={styles.footItem}><Text style={styles.footLabel}>Banco</Text><Text style={styles.footValue}>{e.banco || '—'}</Text></View>
            <View style={styles.footItem}><Text style={styles.footLabel}>Conta Nº</Text><Text style={styles.footValue}>{e.conta || '—'}</Text></View>
            <View style={styles.footItem}><Text style={styles.footLabel}>Agência</Text><Text style={styles.footValue}>{e.agencia || '—'}</Text></View>
            <View style={styles.footItem}><Text style={styles.footLabel}>Cheque Nº</Text><Text style={styles.footValue}>{e.cheque || '—'}</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadNotaEmpenho(tx: NotaData) {
  const blob = await pdf(<NotaEmpenhoDocument tx={tx} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const num = tx.empenho?.numero ? `-${tx.empenho.numero}` : ''
  a.download = `nota-empenho${num}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
