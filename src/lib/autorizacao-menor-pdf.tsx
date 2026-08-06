import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { calcAge } from '@/utils/age'

export type AutorizacaoParticipant = {
  course: { eventNumber?: string | number | null; title: string }
  participant: { name: string; cpf: string | null; birthDate: string | null }
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 48, paddingVertical: 56, fontSize: 11, fontFamily: 'Helvetica', color: '#111', lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  brand: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, textAlign: 'center', color: '#555', marginBottom: 20 },
  sectionBar: { backgroundColor: '#d9d9d9', textAlign: 'center', fontFamily: 'Helvetica-Bold', paddingVertical: 3, fontSize: 10, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontFamily: 'Helvetica-Bold', marginRight: 4 },
  para: { textAlign: 'justify', marginTop: 14 },
  fill: { borderBottomWidth: 1, borderColor: '#000' },
  fieldLine: { marginTop: 18 },
  small: { fontSize: 9, color: '#555' },
  signRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 56 },
  signCol: { width: '70%', alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderColor: '#000', width: '100%', marginBottom: 2 },
  signRole: { fontSize: 9, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#777', textAlign: 'center' },
})

function AutorizacaoPage({ course, participant }: AutorizacaoParticipant) {
  const idade = calcAge(participant.birthDate)
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.brand}>SENAR</Text>
        <Text style={styles.brand}>SISTEMA FAEP</Text>
      </View>

      <Text style={styles.title}>AUTORIZAÇÃO DO RESPONSÁVEL</Text>
      <Text style={styles.subtitle}>Participação de menor de idade em curso</Text>

      <Text style={styles.sectionBar}>DADOS DO CURSO</Text>
      <View style={styles.row}><Text style={styles.label}>Nº Evento:</Text><Text>{course.eventNumber ?? '—'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Curso:</Text><Text>{course.title}</Text></View>

      <Text style={styles.sectionBar}>DADOS DO PARTICIPANTE (MENOR)</Text>
      <View style={styles.row}><Text style={styles.label}>Nome:</Text><Text>{participant.name}</Text></View>
      <View style={styles.row}>
        <Text style={styles.label}>CPF:</Text><Text>{participant.cpf ?? '—'}</Text>
        <Text style={[styles.label, { marginLeft: 24 }]}>Nascimento:</Text>
        <Text>{formatDateFromString(participant.birthDate ?? '') || '—'}{idade !== null ? ` (${idade} anos)` : ''}</Text>
      </View>

      <Text style={styles.para}>
        Eu, _______________________________________________________________,
        portador(a) do CPF nº ____________________ e RG nº ____________________,
        na condição de responsável legal pelo(a) menor acima identificado(a),
        AUTORIZO sua participação no curso indicado, promovido pelo Sindicato Rural
        de Terra Roxa em parceria com o SENAR-PR.
      </Text>
      <Text style={styles.para}>
        Declaro estar ciente de que o SENAR-PR não se responsabiliza por acidentes,
        intoxicações ou prejuízos que possam ocorrer durante ou em decorrência da
        participação no curso, e autorizo o uso das imagens coletadas durante a
        atividade para divulgação, prestação de contas e publicidade das ações.
      </Text>

      <View style={styles.fieldLine}>
        <Text style={styles.small}>Grau de parentesco / vínculo com o menor:</Text>
        <View style={[styles.fill, { marginTop: 14 }]} />
      </View>
      <View style={styles.fieldLine}>
        <Text style={styles.small}>Telefone de contato do responsável:</Text>
        <View style={[styles.fill, { marginTop: 14 }]} />
      </View>

      <View style={styles.signRow}>
        <View style={styles.signCol}>
          <View style={styles.signLine} />
          <Text style={styles.signRole}>Assinatura do responsável legal</Text>
        </View>
      </View>

      <Text style={styles.footer} fixed>
        Sindicato Rural de Terra Roxa — Autorização de participação de menor
      </Text>
    </Page>
  )
}

export function AutorizacaoDocument({ items }: { items: AutorizacaoParticipant[] }) {
  return (
    <Document>
      {items.map((it, i) => <AutorizacaoPage key={i} {...it} />)}
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

export async function downloadAutorizacaoPdf(items: AutorizacaoParticipant[], filename: string) {
  const blob = await pdf(<AutorizacaoDocument items={items} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitize(filename)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
