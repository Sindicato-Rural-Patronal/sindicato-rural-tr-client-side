import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { saveBlob, fileSlug } from '@/utils/download'
import {
  KIND_LABEL, agendaFileName, formatDateBr, rangeLabel, timeRangeLabel, weekdayLong,
  type AgendaEntry,
} from '@/lib/agenda'

// Agenda das salas em PDF (o botão "Imprimir" do Painel Geral): uma tabela por
// dia do período que está na tela. Horários "de parede", como no resto da agenda.

const C = {
  brand: '#1f6e3d',
  border: '#d4d4d8',
  muted: '#6b7280',
  text: '#111827',
  head: '#f3f4f6',
}

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', color: C.text, fontSize: 9 },
  header: { borderBottomWidth: 2, borderColor: C.brand, paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.brand },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  period: { fontSize: 9, color: C.muted, marginTop: 2 },
  dayBar: { backgroundColor: C.head, paddingHorizontal: 6, paddingVertical: 4, marginTop: 10, marginBottom: 2 },
  dayText: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.text, paddingBottom: 3, marginBottom: 1 },
  tr: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderColor: C.border },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  empty: { fontSize: 9, color: C.muted, paddingVertical: 4 },
  cTime: { width: 92, paddingRight: 4 },
  cTitle: { flex: 1, paddingRight: 4 },
  cRoom: { width: 110, paddingRight: 4 },
  cKind: { width: 50, paddingRight: 4 },
  cResp: { width: 110 },
  foot: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: C.muted, flexDirection: 'row', justifyContent: 'space-between' },
})

/** Um dia da agenda no PDF. */
export type AgendaPdfDay = { date: string; items: AgendaEntry[] }

function DayTable({ day }: { day: AgendaPdfDay }) {
  return (
    <View wrap={false}>
      <View style={styles.dayBar}>
        <Text style={styles.dayText}>
          {weekdayLong(day.date)}, {formatDateBr(day.date)}
        </Text>
      </View>
      {day.items.length === 0 ? (
        <Text style={styles.empty}>Nada marcado neste dia.</Text>
      ) : (
        <>
          <View style={styles.th}>
            <Text style={[styles.cTime, styles.thText]}>HORÁRIO</Text>
            <Text style={[styles.cTitle, styles.thText]}>TÍTULO</Text>
            <Text style={[styles.cRoom, styles.thText]}>SALA</Text>
            <Text style={[styles.cKind, styles.thText]}>TIPO</Text>
            <Text style={[styles.cResp, styles.thText]}>RESPONSÁVEL</Text>
          </View>
          {day.items.map(item => (
            <View key={item.key} style={styles.tr}>
              <Text style={styles.cTime}>{timeRangeLabel(item)}</Text>
              <Text style={styles.cTitle}>{item.title}</Text>
              <Text style={styles.cRoom}>{item.roomName}</Text>
              <Text style={styles.cKind}>{KIND_LABEL[item.kind]}</Text>
              <Text style={styles.cResp}>{item.responsible ?? ''}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

/** Agenda do período: cabeçalho do sindicato e uma tabela por dia. */
export function AgendaDocument({ days, from, to, filters }: {
  days: AgendaPdfDay[]
  from: string
  to: string
  /** Sala e tipo escolhidos na tela, quando houver (aparecem no cabeçalho). */
  filters?: { room?: string | null; kind?: string | null; search?: string | null }
}) {
  const marcas = [
    filters?.room ? `Sala: ${filters.room}` : null,
    filters?.kind ? `Tipo: ${filters.kind}` : null,
    filters?.search ? `Busca: ${filters.search}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Sindicato Rural de Terra Roxa</Text>
          <Text style={styles.h1}>Agenda das salas</Text>
          <Text style={styles.period}>
            {from === to ? `Dia ${formatDateBr(from)}` : `Período: ${rangeLabel(from, to)}`}
            {' · '}gerado em {new Date().toLocaleDateString('pt-BR')}
          </Text>
          {marcas ? <Text style={styles.period}>{marcas}</Text> : null}
        </View>

        {days.map(day => <DayTable key={day.date} day={day} />)}

        <View style={styles.foot} fixed>
          <Text>Sindicato Rural de Terra Roxa — Agenda das salas</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/**
 * Gera o PDF e abre numa aba nova, pronto para imprimir. Se o navegador
 * bloquear a aba, baixa o arquivo (assim o clique nunca fica sem resposta).
 */
export async function printAgendaPdf(
  days: AgendaPdfDay[],
  from: string,
  to: string,
  filters?: { room?: string | null; kind?: string | null; search?: string | null },
) {
  const blob = await pdf(<AgendaDocument days={days} from={from} to={to} filters={filters} />).toBlob()
  const name = `${fileSlug(agendaFileName(from, to), Infinity)}.pdf`
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener')
  if (!win) saveBlob(blob, name)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
