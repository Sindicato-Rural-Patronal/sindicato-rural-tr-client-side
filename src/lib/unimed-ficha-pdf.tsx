import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import {
  GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, EDUCATION_OPTIONS,
  type SelectOption,
} from '@/lib/user-form-options'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'

// A ficha precisa do convênio (UnimedDetail), da pessoa completa (UserDataDetail)
// e, opcionalmente, do nome do titular da família (resolvido na tela).
export type FichaData = {
  unimed: UnimedDetail
  user: UserDataDetail
  titularName?: string
}

const C = { text: '#111', muted: '#555', line: '#999', border: '#333', soft: '#f2f2f2' }

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', color: C.text, fontSize: 9 },

  // Cabeçalho
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logoBox: {
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    width: 96, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 7, color: C.muted, textAlign: 'center' },
  title: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', flex: 1, paddingHorizontal: 8 },
  movRow: { textAlign: 'center', fontSize: 8, color: C.muted, marginBottom: 10 },
  movValue: { fontFamily: 'Helvetica-Bold', color: C.text },

  // Boxes
  box: { borderWidth: 1, borderColor: C.border, borderStyle: 'solid', marginBottom: 8 },
  boxTitle: {
    backgroundColor: C.soft, paddingVertical: 3, paddingHorizontal: 6,
    fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  boxBody: { padding: 6 },
  row: { flexDirection: 'row', marginBottom: 6 },

  field: { paddingRight: 8 },
  label: { fontSize: 6, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  value: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2, minHeight: 11,
    borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 1,
  },

  // Declaração + assinaturas
  declara: { fontSize: 8, textAlign: 'justify', lineHeight: 1.4, marginTop: 6, marginBottom: 26, paddingHorizontal: 2 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  signCol: { width: '30%', alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderColor: C.line, width: '100%', marginBottom: 3 },
  signLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Rodapé
  footer: { borderTopWidth: 1, borderColor: C.border, paddingTop: 6, marginTop: 'auto' },
  footTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  footNote: { fontSize: 7, color: C.muted, textAlign: 'center', marginTop: 2 },
})

/** Traduz um valor de enum para o rótulo humano; vazio → string vazia. */
function labelOf(options: SelectOption[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find(o => o.value === value)?.label ?? value
}

/** Formata data ISO/`YYYY-MM-DD`; nulo/inválido → string vazia. */
function fmtDate(v: string | null | undefined): string {
  if (!v) return ''
  return formatDateFromString(v)
}

/** Junta partes não-vazias (ex.: rua + número). */
function joinParts(parts: (string | null | undefined)[], sep = ', '): string {
  return parts.map(p => (p ?? '').toString().trim()).filter(Boolean).join(sep)
}

function Field({ label, value, width }: { label: string; value?: string | null; width?: number | string }) {
  return (
    <View style={[styles.field, width ? { width } : {}]}>
      <Text style={styles.label}>{label}</Text>
      {/* valor vazio → linha em branco (nunca "null") */}
      <Text style={styles.value}>{value || ' '}</Text>
    </View>
  )
}

export function FichaUnimedDocument({ data }: { data: FichaData }) {
  const { unimed: u, user, titularName } = data
  // Endereço vive na primeira propriedade rural; cai pro endereço legado.
  const addr = user.properties?.[0]?.address ?? user.address ?? null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>UNIMED</Text>
          </View>
          <Text style={styles.title}>FORMULÁRIO DE MOVIMENTAÇÃO DE BENEFICIÁRIOS UNIMED</Text>
          <View style={{ width: 96 }} />
        </View>
        {u.tipoMovimento ? (
          <Text style={styles.movRow}>
            TIPO DE MOVIMENTO: <Text style={styles.movValue}>{u.tipoMovimento}</Text>
          </Text>
        ) : (
          <View style={{ marginBottom: 6 }} />
        )}

        {/* Dados do contratante */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Dados do Contratante</Text>
          <View style={styles.boxBody}>
            <View style={styles.row}>
              <Field label="Contratante" value={u.contratante} width="40%" />
              <Field label="Empresa" value={u.empresa} width="35%" />
              <Field label="Plano" value={u.plano} width="25%" />
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Field label="Titular da família" value={titularName} width="40%" />
              <Field label="Matrícula" value={u.matricula} width="30%" />
              <Field label="Data de adesão" value={fmtDate(u.dataAdesao)} width="30%" />
            </View>
          </View>
        </View>

        {/* Dados do usuário */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Dados do Usuário</Text>
          <View style={styles.boxBody}>
            <View style={styles.row}>
              <Field label="Nome completo" value={user.name} width="55%" />
              <Field label="Sexo" value={labelOf(GENDER_OPTIONS, user.gender)} width="20%" />
              <Field label="Data de nascimento" value={fmtDate(user.birthDate)} width="25%" />
            </View>
            <View style={styles.row}>
              <Field label="CPF" value={user.cpf} width="24%" />
              <Field label="Estado civil" value={labelOf(MARITAL_STATUS_OPTIONS, user.maritalStatus)} width="26%" />
              <Field label="RG" value={user.rg} width="20%" />
              <Field label="UF RG" value={user.rgIssuer} width="12%" />
              <Field label="Data de expedição" value={fmtDate(user.rgIssuedAt)} width="18%" />
            </View>
            <View style={styles.row}>
              <Field label="Tipo dependência" value={u.tipoDependente} width="25%" />
              <Field label="Grau de dependência" value={u.grauDependencia} width="25%" />
              <Field label="Escolaridade" value={labelOf(EDUCATION_OPTIONS, user.educationLevel)} width="25%" />
              <Field label="Profissão" value={u.profissao} width="25%" />
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Field label="CNS" value={u.cns} width="25%" />
              <Field label="Nome da mãe" value={u.nomeMae} width="50%" />
              <Field label="Naturalidade" value={user.birthPlace} width="25%" />
            </View>
          </View>
        </View>

        {/* Endereço do usuário */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Endereço do Usuário</Text>
          <View style={styles.boxBody}>
            <View style={styles.row}>
              <Field label="CEP" value={addr?.zipCode} width="20%" />
              <Field label="Fone fixo" value={user.phone} width="26%" />
              <Field label="Celular" value={user.phone2} width="26%" />
              <Field label="E-mail" value={user.email} width="28%" />
            </View>
            <View style={styles.row}>
              <Field label="Endereço" value={joinParts([addr?.street, addr?.number])} width="45%" />
              <Field label="Complemento" value={addr?.complement} width="30%" />
              <Field label="Bairro" value={addr?.neighborhood} width="25%" />
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Field label="Cidade" value={addr?.city} width="60%" />
              <Field label="UF" value={addr?.state} width="15%" />
            </View>
          </View>
        </View>

        {/* Motivo de movimentação */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Motivo de Movimentação</Text>
          <View style={styles.boxBody}>
            <View style={[styles.row, { marginBottom: 6 }]}>
              <Field label="Motivo" value={u.motivo} width="100%" />
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Field label="Observações" value={u.obs} width="100%" />
            </View>
          </View>
        </View>

        {/* Declaração + assinaturas */}
        <Text style={styles.declara}>
          Declaro, para os devidos fins, que as informações prestadas neste formulário são verdadeiras e assumo
          inteira responsabilidade pelos dados aqui declarados, autorizando a movimentação do beneficiário junto
          à Unimed conforme o motivo indicado.
        </Text>
        <View style={styles.signRow}>
          <View style={styles.signCol}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Data</Text>
          </View>
          <View style={styles.signCol}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Assinatura do Titular</Text>
          </View>
          <View style={styles.signCol}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Contratante</Text>
          </View>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text style={styles.footTitle}>Para uso exclusivo da Unimed Vale do Piquiri</Text>
          <Text style={styles.footNote}>
            Documento gerado eletronicamente — Sindicato Rural de Terra Roxa / PR.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/** Higieniza o nome pro nome do arquivo. */
function slug(v: string): string {
  return (v || 'beneficiario')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

export async function downloadFichaUnimed(data: FichaData) {
  const blob = await pdf(<FichaUnimedDocument data={data} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ficha-unimed-${slug(data.user.name)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
