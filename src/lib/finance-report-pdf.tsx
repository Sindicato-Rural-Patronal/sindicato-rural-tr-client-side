import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { centsToBRL } from '@/utils/masks'
import type { FinanceSummary, FinanceTransaction } from '@/hooks/useFinance'

const C = {
  brand: '#1f6e3d',
  in: '#16a34a',
  out: '#dc2626',
  border: '#d4d4d8',
  muted: '#6b7280',
  text: '#111827',
}

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', color: C.text, fontSize: 9 },
  header: { borderBottomWidth: 2, borderColor: C.brand, paddingBottom: 8, marginBottom: 14 },
  brand: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.brand },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  period: { fontSize: 9, color: C.muted, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  kpiValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  section: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 6 },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  col: { flex: 1 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderColor: C.border },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.text, paddingBottom: 3, marginBottom: 2 },
  tr: { flexDirection: 'row', paddingVertical: 2.5, borderBottomWidth: 0.5, borderColor: C.border },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  cData: { width: 52 },
  cDesc: { flex: 1, paddingRight: 4 },
  cCat: { width: 90 },
  cAcc: { width: 74 },
  cVal: { width: 68, textAlign: 'right' },
  foot: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: C.muted, textAlign: 'center' },
})

function typeLabel(t: FinanceTransaction): string {
  if (t.transferId) return 'Transf.'
  return t.type === 'IN' ? 'Entrada' : 'Saída'
}

export function FinanceReportDocument({ summary, transactions, range }: {
  summary: FinanceSummary
  transactions: FinanceTransaction[]
  range: { from?: string; to?: string }
}) {
  const per = range.from && range.to
    ? `Período: ${formatDateFromString(range.from)} a ${formatDateFromString(range.to)}`
    : 'Todo o período'
  const outCats = summary.byCategory.filter(c => c.type === 'OUT')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Sindicato Rural de Terra Roxa</Text>
          <Text style={styles.h1}>Relatório Financeiro</Text>
          <Text style={styles.period}>{per} · gerado em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Saldo em caixa</Text>
            <Text style={styles.kpiValue}>{centsToBRL(summary.balanceAllTimeCents)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Entradas</Text>
            <Text style={[styles.kpiValue, { color: C.in }]}>{centsToBRL(summary.periodInCents)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Saídas</Text>
            <Text style={[styles.kpiValue, { color: C.out }]}>{centsToBRL(summary.periodOutCents)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Resultado</Text>
            <Text style={[styles.kpiValue, { color: summary.periodResultCents < 0 ? C.out : C.in }]}>
              {centsToBRL(summary.periodResultCents)}
            </Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.section}>Saldo por caixa</Text>
            {summary.byAccount.length === 0
              ? <Text style={{ color: C.muted }}>Sem movimento.</Text>
              : summary.byAccount.map(a => (
                <View key={a.accountId ?? 'none'} style={styles.lineRow}>
                  <Text>{a.name}</Text>
                  <Text style={{ color: a.balanceCents < 0 ? C.out : C.text }}>{centsToBRL(a.balanceCents)}</Text>
                </View>
              ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.section}>Saídas por categoria</Text>
            {outCats.length === 0
              ? <Text style={{ color: C.muted }}>Sem saídas no período.</Text>
              : outCats.map(c => (
                <View key={c.categoryId ?? c.name} style={styles.lineRow}>
                  <Text>{c.name}</Text>
                  <Text>{centsToBRL(c.totalCents)}</Text>
                </View>
              ))}
          </View>
        </View>

        <Text style={styles.section}>Lançamentos ({transactions.length})</Text>
        <View style={styles.th}>
          <Text style={[styles.thText, styles.cData]}>Data</Text>
          <Text style={[styles.thText, styles.cDesc]}>Descrição</Text>
          <Text style={[styles.thText, styles.cCat]}>Categoria</Text>
          <Text style={[styles.thText, styles.cAcc]}>Caixa</Text>
          <Text style={[styles.thText, styles.cVal]}>Valor</Text>
        </View>
        {transactions.map(t => (
          <View key={t.id} style={styles.tr} wrap={false}>
            <Text style={styles.cData}>{formatDateFromString(t.date.slice(0, 10))}</Text>
            <Text style={styles.cDesc}>{t.description}</Text>
            <Text style={styles.cCat}>{t.category?.name ?? (t.transferId ? typeLabel(t) : '—')}</Text>
            <Text style={styles.cAcc}>{t.account?.name ?? '—'}</Text>
            <Text style={[styles.cVal, { color: t.type === 'IN' ? C.in : C.out }]}>
              {t.type === 'IN' ? '+' : '-'} {centsToBRL(t.amountCents)}
            </Text>
          </View>
        ))}

        <Text style={styles.foot} fixed>Sindicato Rural de Terra Roxa · Terra Roxa - PR · Relatório interno</Text>
      </Page>
    </Document>
  )
}

export async function downloadFinanceReportPdf(
  summary: FinanceSummary,
  transactions: FinanceTransaction[],
  range: { from?: string; to?: string },
) {
  const blob = await pdf(
    <FinanceReportDocument summary={summary} transactions={transactions} range={range} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
