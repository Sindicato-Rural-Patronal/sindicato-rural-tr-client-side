import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'
import type { UserDataDetail, UserProperty } from '@/hooks/useAdmin'
import { formatDateFromString } from '@/utils/format-data-from-string'

// Endereço agora vive na propriedade principal do associado (o user.address
// legado foi descontinuado).
type PropAddress = NonNullable<UserProperty['address']>

// Salário mínimo de referência (centavos) usado para enquadrar a renda familiar
// nas faixas da ficha SENAR. Ajuste quando o piso nacional mudar.
const MINIMUM_WAGE_CENTS = 151_800 // R$ 1.518,00

export type FichaParticipant = {
  course: { eventNumber?: string | number | null; title: string }
  user: UserDataDetail
}

// ─── mapeamentos ──────────────────────────────────────────────────────────────

function formatCep(cep: string | null | undefined): string {
  if (!cep) return ''
  const d = cep.replace(/\D/g, '')
  if (d.length !== 8) return cep
  return `${d.slice(0, 2)}.${d.slice(2, 5)}-${d.slice(5)}`
}

function composeAddress(a: PropAddress | null): string {
  if (!a) return ''
  if (a.type === 'RURAL') {
    return [a.localityName, a.road, a.km && `KM ${a.km}`, a.lot && `Lote ${a.lot}`, a.section]
      .filter(Boolean)
      .join(', ')
  }
  const base = [a.street, a.number].filter(Boolean).join(', ')
  return [base, a.complement].filter(Boolean).join(' - ')
}

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null
  const iso = birthDate.split('T')[0]
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  let age = now.getFullYear() - y
  const monthDiff = now.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age--
  return age
}

function ageBucket(age: number | null): string | null {
  if (age === null) return null
  if (age <= 17) return 'ate17'
  if (age <= 24) return '18a24'
  if (age <= 45) return '25a45'
  if (age <= 64) return '46a64'
  return 'acima65'
}

function incomeBucket(familyIncome: string | null): string | null {
  if (!familyIncome) return null
  const cents = Number(String(familyIncome).replace(/\D/g, ''))
  if (!cents) return null
  const ratio = cents / MINIMUM_WAGE_CENTS
  if (ratio <= 0.5) return 'ate_meio'
  if (ratio <= 1) return 'meio_1'
  if (ratio <= 3) return '1_3'
  if (ratio <= 5) return '3_5'
  if (ratio <= 10) return '5_10'
  return 'acima_10'
}

// educationLevel (enum backend) → chave da opção na ficha
const EDUCATION_MAP: Record<string, string> = {
  NO_FORMAL_EDUCATION: 'nao_alfabetizado',
  INCOMPLETE_PRIMARY: 'fund_i',
  COMPLETE_PRIMARY: 'fund_ii',
  INCOMPLETE_SECONDARY: 'medio_incompleto',
  COMPLETE_SECONDARY: 'medio_completo',
  INCOMPLETE_HIGHER: 'sup_incompleto',
  COMPLETE_HIGHER: 'sup_completo',
  POSTGRADUATE: 'pos',
}

const ETHNICITY_MAP: Record<string, string> = {
  WHITE: 'branca',
  BLACK: 'negra',
  MIXED: 'parda',
  ASIAN: 'amarela',
  INDIGENOUS: 'indigena',
}

// functionalCategory é texto livre — tenta enquadrar numa das opções da ficha
function functionalCategoryKey(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('família') || v.includes('familia')) return 'familia'
  if (v.includes('assalariado')) return 'assalariado'
  if (v.includes('autônomo') || v.includes('autonomo')) return 'autonomo'
  if (v.includes('desempreg')) return 'desempregado'
  if (v.includes('produtor')) return 'produtor'
  return 'outro'
}

// ─── estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { paddingHorizontal: 28, paddingVertical: 24, fontSize: 8, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerBrand: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  topRow: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  courseRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#000', marginBottom: 6 },
  courseLabel: { fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, paddingVertical: 3, borderRightWidth: 1, borderColor: '#000' },
  courseValue: { fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 },
  sectionBar: { backgroundColor: '#d9d9d9', textAlign: 'center', fontFamily: 'Helvetica-Bold', paddingVertical: 2, marginTop: 4 },
  fieldRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#999', minHeight: 16, alignItems: 'center' },
  fieldLabel: { fontFamily: 'Helvetica-Bold', paddingRight: 4, paddingVertical: 2 },
  fieldValue: { flex: 1, paddingVertical: 2 },
  divider: { borderRightWidth: 1, borderColor: '#999', marginHorizontal: 6, height: '100%' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 4, gap: 2 },
  checkItem: { flexDirection: 'row', alignItems: 'center', width: '20%', marginBottom: 3 },
  checkItemWide: { flexDirection: 'row', alignItems: 'center', width: '33%', marginBottom: 3 },
  // Checkbox: quadrado com borda; quando marcado, um quadradinho preto interno.
  // (Um <Text> "X" dentro de um <View> pequeno com borda não renderiza no
  // react-pdf, e um <Text> com altura fixa clipa o conteúdo — por isso a marca
  // é um <View> preenchido, que sempre renderiza.)
  box: { width: 9, height: 9, borderWidth: 1, borderColor: '#000', marginRight: 3, padding: 1.5 },
  boxFill: { flex: 1, backgroundColor: '#000' },
  declaration: { fontSize: 6, textAlign: 'justify', marginTop: 8, color: '#333' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  signCol: { width: '45%', alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderColor: '#000', width: '100%', marginBottom: 2 },
  signName: { fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center' },
  signRole: { fontSize: 7, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 12, left: 28, right: 28, fontSize: 6, color: '#777', textAlign: 'center' },
})

function Box({ on }: { on?: boolean }) {
  return <View style={styles.box}>{on ? <View style={styles.boxFill} /> : null}</View>
}

function Check({ on, label, wide }: { on?: boolean; label: string; wide?: boolean }) {
  return (
    <View style={wide ? styles.checkItemWide : styles.checkItem}>
      <Box on={on} />
      <Text>{label}</Text>
    </View>
  )
}

function Field({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flex }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

// ─── página da ficha ──────────────────────────────────────────────────────────

function FichaPage({ course, user }: FichaParticipant) {
  const props = user.properties ?? []
  const mainProp = props.find(p => p.id === user.primaryPropertyId) ?? props[0]
  const a = mainProp?.address ?? null
  const edu = user.educationLevel ? EDUCATION_MAP[user.educationLevel] : null
  const eth = user.ethnicity ? ETHNICITY_MAP[user.ethnicity] : null
  const cat = functionalCategoryKey(user.functionalCategory)
  const bucket = incomeBucket(user.familyIncome)
  const ageB = ageBucket(ageFrom(user.birthDate))

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerBrand}>SENAR</Text>
        <Text style={styles.title}>FICHA DE INSCRIÇÃO</Text>
        <Text style={styles.headerBrand}>SISTEMA FAEP</Text>
      </View>

      <View style={styles.topRow}>
        <Text><Text style={styles.bold}>Nº EVENTO: </Text>{course.eventNumber ?? ''}</Text>
        <Text><Text style={styles.bold}>Nº COOPERADO: </Text>{user.memberNotesNumber ?? ''}</Text>
      </View>

      <View style={styles.courseRow}>
        <Text style={styles.courseLabel}>ETAPA / CURSO</Text>
        <Text style={styles.courseValue}>{course.title}</Text>
      </View>

      <Text style={styles.sectionBar}>DADOS DO PARTICIPANTE</Text>

      <View style={styles.fieldRow}><Field label="NOME:" value={user.name} /></View>
      <View style={styles.fieldRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={styles.fieldLabel}>SEXO:</Text>
          <Check on={user.gender === 'MALE'} label="M" />
          <Check on={user.gender === 'FEMALE'} label="F" />
        </View>
        <Field label="DATA DE NASCIMENTO:" value={formatDateFromString(user.birthDate ?? '')} flex={1.4} />
      </View>
      <View style={styles.fieldRow}><Field label="NATURAL DE:" value={user.birthPlace ?? ''} /></View>
      <View style={styles.fieldRow}>
        <Field label="CPF Nº:" value={user.cpf ?? ''} />
        <Field label="CAD/PRO:" value={user.cadPro ?? ''} />
        <Field label="ESTADO:" value={a?.state ?? ''} flex={0.7} />
      </View>
      <View style={styles.fieldRow}><Field label="ENDEREÇO:" value={composeAddress(a)} /></View>
      <View style={styles.fieldRow}>
        <Field label="BAIRRO:" value={a?.neighborhood ?? ''} />
        <Field label="CEP:" value={formatCep(a?.zipCode)} flex={0.7} />
      </View>
      <View style={styles.fieldRow}><Field label="MUNICÍPIO:" value={a?.city ?? ''} /></View>
      <View style={styles.fieldRow}>
        <Field label="FONE:" value={user.phone ?? ''} />
        <Field label="CONTATO / RECADO:" value={user.phone2 ?? ''} />
      </View>
      <View style={styles.fieldRow}><Field label="E-MAIL:" value={user.email ?? ''} /></View>

      <Text style={styles.sectionBar}>ESCOLARIDADE</Text>
      <View style={styles.checkGrid}>
        <Check on={false} label="Alfabetizado" />
        <Check on={edu === 'fund_i'} label="Ensino Fund. I (1ª a 5ª)" />
        <Check on={edu === 'medio_completo'} label="Médio Completo" />
        <Check on={edu === 'sup_completo'} label="Superior Completo" />
        <Check on={edu === 'pos'} label="Pós Graduação" />
        <Check on={edu === 'nao_alfabetizado'} label="Não Alfabetizado" />
        <Check on={edu === 'fund_ii'} label="Ensino Fund. II (6ª a 9ª)" />
        <Check on={edu === 'medio_incompleto'} label="Médio Incompleto" />
        <Check on={edu === 'sup_incompleto'} label="Superior Incompleto" />
      </View>

      <Text style={styles.sectionBar}>CATEGORIA FUNCIONAL</Text>
      <View style={styles.checkGrid}>
        <Check on={cat === 'produtor'} label="Produtor Rural" />
        <Check on={cat === 'familia'} label="Família do produtor" />
        <Check on={cat === 'assalariado'} label="Trab. rural assalariado" />
        <Check on={cat === 'autonomo'} label="Trab. rural autônomo" />
        <Check on={cat === 'desempregado'} label="Desempregado" />
        <Check on={cat === 'outro'} label={`Outro: ${user.functionalCategory ?? ''}`} wide />
      </View>

      <Text style={styles.sectionBar}>ETNIA</Text>
      <View style={styles.checkGrid}>
        <Check on={eth === 'branca'} label="Branca" />
        <Check on={eth === 'negra'} label="Negra" />
        <Check on={eth === 'parda'} label="Parda" />
        <Check on={eth === 'amarela'} label="Amarela" />
        <Check on={eth === 'indigena'} label="Indígena" />
        <Check on={!eth} label="Não declarada" />
      </View>

      <Text style={styles.sectionBar}>PESSOA COM NECESSIDADE EDUCACIONAL ESPECIAL</Text>
      <View style={styles.checkGrid}>
        <Check on={false} label="Def. auditiva" />
        <Check on={false} label="Def. física" />
        <Check on={false} label="Def. mental" />
        <Check on={false} label="Def. visual" />
        <Check on={false} label="Def. múltipla" />
        <Check on={user.specialNeeds} label="Possui (ver cadastro)" />
      </View>

      <Text style={styles.sectionBar}>FAIXA ETÁRIA</Text>
      <View style={styles.checkGrid}>
        <Check on={ageB === 'ate17'} label="Até 17 anos" />
        <Check on={ageB === '18a24'} label="18 a 24 anos" />
        <Check on={ageB === '25a45'} label="25 a 45 anos" />
        <Check on={ageB === '46a64'} label="46 a 64 anos" />
        <Check on={ageB === 'acima65'} label="Acima de 65 anos" />
      </View>

      <Text style={styles.sectionBar}>RENDA FAMILIAR</Text>
      <View style={styles.checkGrid}>
        <Check on={bucket === 'ate_meio'} label="até ½ salário min." />
        <Check on={bucket === 'meio_1'} label="de ½ a 1 salário min." />
        <Check on={bucket === '1_3'} label="de 1 a 3 salários min." />
        <Check on={bucket === '3_5'} label="de 3 a 5 salários min." />
        <Check on={bucket === '5_10'} label="de 5 a 10 salários min." />
        <Check on={bucket === 'acima_10'} label="acima de 10 salários min." />
      </View>

      <Text style={styles.declaration}>
        O inscrito declara ter conhecimento que o SENAR-PR não se responsabiliza por acidentes, intoxicações,
        prejuízos, que possam ocorrer durante ou em decorrência de sua participação no curso ou do uso de sua
        propriedade. Também se declara ciente que todos os dados pessoais aqui informados serão utilizados e
        tratados pelo SENAR-PR para a realização de atividades relacionadas a sua atividade fim (Formação
        Profissional e Promoção Social), como gestão, controle e transparência sem prejuízo de outras. Todas as
        imagens coletadas no curso, pessoais ou da propriedade, poderão ser utilizadas pelo SENAR-PR, para
        divulgação, prestação de contas e publicidade de suas ações, ficando, desde logo, o uso dessas imagens,
        autorizada pelo participante. Se o número de inscritos for inferior ao mínimo previsto, o curso poderá ser
        cancelado.
      </Text>

      <View style={styles.signRow}>
        <View style={styles.signCol}>
          <View style={styles.signLine} />
          <Text style={styles.signRole}>RESPONSÁVEL PELA INSCRIÇÃO</Text>
        </View>
        <View style={styles.signCol}>
          <View style={styles.signLine} />
          <Text style={styles.signName}>{user.name}</Text>
          <Text style={styles.signRole}>PARTICIPANTE</Text>
        </View>
      </View>

      <Text style={styles.footer} fixed>
        Sindicato Rural de Terra Roxa — Ficha de Inscrição
      </Text>
    </Page>
  )
}

export function FichaInscricaoDocument({ fichas }: { fichas: FichaParticipant[] }) {
  return (
    <Document>
      {fichas.map((f, i) => (
        <FichaPage key={i} {...f} />
      ))}
    </Document>
  )
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export async function downloadFichaPdf(fichas: FichaParticipant[], filename: string) {
  const blob = await pdf(<FichaInscricaoDocument fichas={fichas} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(filename)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
