import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'

export type CertificadoParticipant = {
  course: {
    title: string
    eventNumber?: string | number | null
    workloadHours?: number | null
    startDate?: string | null
    endDate?: string | null
    location?: string | null
  }
  participant: { name: string; cpf: string | null }
}

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', color: '#111' },
  frame: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#1f6e3d',
    borderStyle: 'solid',
    paddingHorizontal: 56,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  brand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1f6e3d' },
  title: { fontSize: 34, fontFamily: 'Helvetica-Bold', letterSpacing: 3, color: '#1f6e3d', marginTop: 6 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 8 },
  intro: { fontSize: 12, textAlign: 'center' },
  name: { fontSize: 24, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginVertical: 8 },
  cpf: { fontSize: 10, color: '#555', textAlign: 'center' },
  body: { fontSize: 12, textAlign: 'center', lineHeight: 1.6, marginTop: 12, maxWidth: 620 },
  courseName: { fontFamily: 'Helvetica-Bold' },
  signRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 24 },
  signCol: { width: '38%', alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderColor: '#000', width: '100%', marginBottom: 3 },
  signRole: { fontSize: 9, textAlign: 'center' },
  foot: { fontSize: 9, color: '#777', marginTop: 10 },
})

function periodo(start?: string | null, end?: string | null): string {
  const s = start ? formatDateFromString(start) : ''
  const e = end ? formatDateFromString(end) : ''
  if (s && e) return `no período de ${s} a ${e}`
  if (s) return `em ${s}`
  return ''
}

function CertificadoPage({ course, participant }: CertificadoParticipant) {
  const carga = course.workloadHours ? `, com carga horária de ${course.workloadHours} hora(s)` : ''
  const local = course.location ? `, em ${course.location}` : ''
  const per = periodo(course.startDate, course.endDate)
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.frame}>
        <View style={styles.header}>
          <Text style={styles.brand}>SENAR-PR</Text>
          <Text style={styles.brand}>SISTEMA FAEP</Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>CERTIFICADO</Text>
          <Text style={styles.subtitle}>de conclusão</Text>

          <Text style={styles.intro}>Certificamos que</Text>
          <Text style={styles.name}>{participant.name}</Text>
          {participant.cpf ? <Text style={styles.cpf}>CPF: {participant.cpf}</Text> : null}

          <Text style={styles.body}>
            concluiu com aproveitamento o curso{' '}
            <Text style={styles.courseName}>{course.title}</Text>
            {course.eventNumber ? ` (Nº ${course.eventNumber})` : ''}
            {carga}
            {per ? `, ${per}` : ''}
            {local}, promovido pelo Sindicato Rural de Terra Roxa em parceria com o SENAR-PR.
          </Text>
        </View>

        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signRole}>Coordenação — Sindicato Rural de Terra Roxa</Text>
            </View>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signRole}>Instrutor(a)</Text>
            </View>
          </View>
          <Text style={styles.foot}>Terra Roxa - PR</Text>
        </View>
      </View>
    </Page>
  )
}

export function CertificadoDocument({ items }: { items: CertificadoParticipant[] }) {
  return (
    <Document>
      {items.map((it, i) => <CertificadoPage key={i} {...it} />)}
    </Document>
  )
}

function sanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export async function downloadCertificadoPdf(items: CertificadoParticipant[], filename: string) {
  const blob = await pdf(<CertificadoDocument items={items} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitize(filename)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // revoga com atraso — revogar imediato pode truncar PDFs grandes em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
