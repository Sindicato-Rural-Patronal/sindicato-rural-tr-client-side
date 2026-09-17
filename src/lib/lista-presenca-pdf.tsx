import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { fileSlug, saveBlob } from '@/utils/download'
import { maskCPF } from '@/utils/masks'
import { courseDays, sortByName } from '@/utils/course-attendance'

export type ListaPresencaCourse = {
  title: string
  eventNumber?: string | number | null
  /** "YYYY-MM-DD" */
  startDate: string
  endDate?: string | null
  /** "HH:MM" */
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  instructors?: string[]
}

export type ListaPresencaParticipant = { name: string; cpf: string | null }

const styles = StyleSheet.create({
  page: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerBrand: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  bold: { fontFamily: 'Helvetica-Bold' },
  courseRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#000', marginBottom: 4 },
  courseLabel: { fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, paddingVertical: 3, borderRightWidth: 1, borderColor: '#000' },
  courseValue: { flex: 1, fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 2, marginBottom: 2 },
  dayBar: { backgroundColor: '#d9d9d9', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 10, paddingVertical: 3, marginTop: 6 },
  tableHead: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', backgroundColor: '#f0f0f0', marginTop: 6 },
  row: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#000', minHeight: 26, alignItems: 'center' },
  th: { fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, paddingVertical: 4 },
  td: { paddingHorizontal: 4, paddingVertical: 3 },
  colNum: { width: 28, textAlign: 'center', borderRightWidth: 1, borderColor: '#000', alignSelf: 'stretch', justifyContent: 'center' },
  colName: { flex: 1.6, borderRightWidth: 1, borderColor: '#000', alignSelf: 'stretch', justifyContent: 'center' },
  colCpf: { width: 92, borderRightWidth: 1, borderColor: '#000', alignSelf: 'stretch', justifyContent: 'center' },
  colSign: { flex: 1.4 },
  footer: { position: 'absolute', bottom: 14, left: 28, right: 28, fontSize: 7, color: '#777', flexDirection: 'row', justifyContent: 'space-between' },
})

function horario(start?: string | null, end?: string | null): string {
  if (start && end) return `${start} às ${end}`
  return start || end || ''
}

function DayPage({ course, participants, day, dayIndex, dayCount }: {
  course: ListaPresencaCourse
  participants: ListaPresencaParticipant[]
  day: string
  dayIndex: number
  dayCount: number
}) {
  const instructors = (course.instructors ?? []).filter(Boolean).join(', ')
  const time = horario(course.startTime, course.endTime)
  const multiDay = dayCount > 1
  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Cabeçalho e título da tabela se repetem em cada folha quando a lista não cabe numa só. */}
      <View fixed>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>SENAR</Text>
          <Text style={styles.title}>LISTA DE PRESENÇA</Text>
          <Text style={styles.headerBrand}>SISTEMA FAEP</Text>
        </View>

        <View style={styles.courseRow}>
          <Text style={styles.courseLabel}>CURSO</Text>
          <Text style={styles.courseValue}>{course.title}</Text>
        </View>

        <View style={styles.infoRow}>
          {course.eventNumber ? <Text><Text style={styles.bold}>Nº EVENTO: </Text>{course.eventNumber}</Text> : null}
          {multiDay && course.endDate ? (
            <Text>
              <Text style={styles.bold}>PERÍODO: </Text>
              {formatDateFromString(course.startDate)} a {formatDateFromString(course.endDate)}
            </Text>
          ) : null}
          {time ? <Text><Text style={styles.bold}>HORÁRIO: </Text>{time}</Text> : null}
        </View>
        <View style={styles.infoRow}>
          {course.location ? <Text><Text style={styles.bold}>LOCAL: </Text>{course.location}</Text> : null}
          {instructors ? <Text><Text style={styles.bold}>INSTRUTOR(ES): </Text>{instructors}</Text> : null}
        </View>

        <Text style={styles.dayBar}>
          DATA: {formatDateFromString(day)}{multiDay ? ` (dia ${dayIndex + 1} de ${dayCount})` : ''}
        </Text>

        <View style={styles.tableHead}>
          <View style={styles.colNum}><Text style={styles.th}>Nº</Text></View>
          <View style={styles.colName}><Text style={styles.th}>NOME</Text></View>
          <View style={styles.colCpf}><Text style={styles.th}>CPF</Text></View>
          <View style={styles.colSign}><Text style={styles.th}>ASSINATURA</Text></View>
        </View>
      </View>

      {participants.map((p, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <View style={styles.colNum}><Text style={styles.td}>{i + 1}</Text></View>
          <View style={styles.colName}><Text style={styles.td}>{p.name}</Text></View>
          <View style={styles.colCpf}><Text style={styles.td}>{p.cpf ? maskCPF(p.cpf) : ''}</Text></View>
          <View style={styles.colSign} />
        </View>
      ))}

      <View style={styles.footer} fixed>
        <Text>Sindicato Rural de Terra Roxa — Lista de Presença</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  )
}

/** Uma folha (ou mais, se a lista for longa) por dia do curso, inscritos em ordem alfabética. */
export function ListaPresencaDocument({ course, participants }: {
  course: ListaPresencaCourse
  participants: ListaPresencaParticipant[]
}) {
  const sorted = sortByName(participants)
  const days = courseDays(course.startDate, course.endDate)
  // Sem data válida ainda sai uma folha, com a data em branco para preencher à mão.
  const pages = days.length > 0 ? days : ['']
  return (
    <Document>
      {pages.map((day, i) => (
        <DayPage key={day || i} course={course} participants={sorted} day={day} dayIndex={i} dayCount={pages.length} />
      ))}
    </Document>
  )
}

export async function downloadListaPresencaPdf(
  course: ListaPresencaCourse,
  participants: ListaPresencaParticipant[],
  filename: string,
) {
  const blob = await pdf(<ListaPresencaDocument course={course} participants={participants} />).toBlob()
  saveBlob(blob, `${fileSlug(filename, Infinity)}.pdf`)
}
