import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { fileSlug, saveBlob } from '@/utils/download'
import { GENDER_OPTIONS, EDUCATION_OPTIONS, type SelectOption } from '@/lib/user-form-options'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'
import { resolveAddress, addressFields, splitPhones, fmtCPF, fmtDate, maritalWord } from '@/lib/unimed-pdf-utils'
import { UNIMED_HEADER_PNG } from '@/lib/unimed-pdf-assets'

// Réplica do "Formulário de Movimentação de Beneficiários Unimed" do sistema
// legado (ruraltr.com.br/unimed/ficha_print.php): mesmas medidas em pt, fontes,
// caixas e textos fixos — só os dados do beneficiário mudam.

// A ficha precisa do convênio (UnimedDetail), da pessoa completa (UserDataDetail)
// e, opcionalmente, do nome do titular da família (resolvido na tela).
export type FichaData = {
  unimed: UnimedDetail
  user: UserDataDetail
  titularName?: string
}

// Medidas do modelo (pt). Página A4 com margem de 28.5 (print do Chrome).
const PAGE_PAD = 28.5
const CONTENT_W = 539.25
const BODY = 9.3          // Arial 9.3 — texto das caixas
const STRONG = 9.9        // Arial Bold 9.9 — títulos de seção e nomes
const SMALL = 6.6         // Arial Bold 6.6 — observações/assinaturas/aviso
const TIMES = 8.8         // Times Bold 8.8 — bloco "uso exclusivo da Unimed"
const LINE = 14.3         // passo de linha nas caixas de 4 linhas

const C = { text: '#000', light: '#a8a8a8', dark: '#545454' }

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD, paddingHorizontal: PAGE_PAD, paddingBottom: 20,
    fontFamily: 'Helvetica', fontSize: BODY, color: C.text,
  },
  header: { width: CONTENT_W, height: 62.6 },
  title: {
    fontSize: 13.2, fontFamily: 'Helvetica-Bold', textAlign: 'center',
    marginTop: 15, marginBottom: 6.5,
  },

  // Bordas de tabela HTML (border=1): externa "outset", interna "inset", 0.5pt cada.
  outer: {
    borderStyle: 'solid',
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5,
    borderTopColor: C.light, borderLeftColor: C.light, borderBottomColor: C.dark, borderRightColor: C.dark,
  },
  inner: {
    borderStyle: 'solid',
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5,
    borderTopColor: C.dark, borderLeftColor: C.dark, borderBottomColor: C.light, borderRightColor: C.light,
  },
  cellRow: { flexDirection: 'row' },

  // Linha "TIPO MOVIMENTO | valor"
  movCell: { height: 23.8, justifyContent: 'center' },
  movText: { fontSize: STRONG, fontFamily: 'Helvetica-Bold', textAlign: 'center' },

  sectionTitle: {
    fontSize: STRONG, fontFamily: 'Helvetica-Bold', textAlign: 'center',
    marginTop: 3, marginBottom: 3.5,
  },
  boxBody: { paddingTop: 12, paddingBottom: 6, paddingLeft: 8.7, paddingRight: 8 },
  line: { fontSize: BODY, lineHeight: LINE / BODY },
  strong: { fontSize: STRONG, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row' },
  rowGap: { flexDirection: 'row', marginBottom: 3.2 },

  obsLabel: { fontSize: SMALL, fontFamily: 'Helvetica-Bold', marginTop: 9 },
  declara: { fontSize: BODY, marginTop: 7.7 },

  signRow: { flexDirection: 'row', marginTop: 26 },
  signCol: { width: '33.33%', alignItems: 'center' },
  signLine: { fontSize: TIMES, fontFamily: 'Times-Bold', height: 11 },
  signLabel: { fontSize: SMALL, fontFamily: 'Helvetica-Bold', marginTop: 0.5 },
  warning: { fontSize: SMALL, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  usoTitle: { fontSize: BODY, marginTop: 10, marginBottom: 1 },

  usoLeft: { width: 290.5, paddingTop: 8.5, paddingBottom: 8.5, paddingLeft: 7.8, paddingRight: 6 },
  usoRight: { flex: 1, paddingTop: 11, paddingBottom: 8 },
  times: { fontSize: TIMES, fontFamily: 'Times-Bold', lineHeight: 9.9 / TIMES },
  timesRight: { fontSize: TIMES, fontFamily: 'Times-Bold', textAlign: 'right', paddingRight: 35, marginBottom: 10.7 },
  timesCenter: { fontSize: TIMES, fontFamily: 'Times-Bold', textAlign: 'center', marginBottom: 7 },
})

/** Traduz um valor de enum para o rótulo humano; vazio → string vazia. */
function labelOf(options: SelectOption[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find(o => o.value === value)?.label ?? value
}

/** Caixa com borda dupla (outset + inset), como tabela HTML. */
type BoxStyle = Exclude<NonNullable<React.ComponentProps<typeof View>['style']>, readonly unknown[]>

function Box({ children, body }: { children: React.ReactNode; body?: BoxStyle }) {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, styles.boxBody, body ?? {}]}>{children}</View>
    </View>
  )
}

/** "RÓTULO: valor" numa linha; `width` fixa a coluna quando há mais de um por linha. */
function L({ label, value, width, strong }: { label: string; value?: string | null; width?: number; strong?: boolean }) {
  return (
    <Text style={[styles.line, width ? { width } : { flexGrow: 1 }]}>
      {label}: {strong ? <Text style={styles.strong}>{value || ''}</Text> : (value || '')}
    </Text>
  )
}

const USO_TEXTO =
  '1 - Data do recebimento do Formulário de Movimentação de\n' +
  'Beneficiários Unimed com cópia dos Documentos pessoais e Declaração\n' +
  'de Saúde devidamente preenchida. No prazo de  15 dias do recebimento\n' +
  'será analisada a Declaração de Saúde para possível aplicação de\n' +
  'Cobertura Parcial Temporária.'

export function FichaUnimedDocument({ data }: { data: FichaData }) {
  const { unimed: u, user, titularName } = data
  const addr = addressFields(resolveAddress(user))
  const tel = splitPhones(user)
  // Sem titular vinculado e cadastrado como titular → a própria pessoa é o titular da família.
  const titular = titularName
    || (/TITULAR/i.test(`${u.grauDependencia ?? ''} ${u.tipoDependente ?? ''}`) ? user.name : '')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Unimed Vale do Piquiri (imagem do modelo) */}
        <Image src={UNIMED_HEADER_PNG} style={styles.header} />
        <Text style={styles.title}>FORMULÁRIO DE MOVIMENTAÇÃO DE BENEFICIÁRIOS UNIMED</Text>

        {/* TIPO MOVIMENTO | valor */}
        <View style={[styles.outer, styles.cellRow]}>
          <View style={[styles.inner, styles.movCell, { width: 280.6 }]}>
            <Text style={styles.movText}>TIPO MOVIMENTO</Text>
          </View>
          <View style={[styles.inner, styles.movCell, { flex: 1 }]}>
            <Text style={styles.movText}>{u.tipoMovimento || ' '}</Text>
          </View>
        </View>

        {/* Dados do contratante */}
        <Text style={styles.sectionTitle}>DADOS DO CONTRATANTE</Text>
        <Box>
          <L label="CONTRATANTE" value={u.contratante} />
          <L label="EMPRESA" value={u.empresa} />
          <L label="PLANO" value={u.plano} />
          <View style={styles.row}>
            <L label="TITULAR DA FAMÍLIA" value={titular} width={265.6} strong />
            <L label="MATRÍCULA" value={u.matricula} width={109.4} />
            <L label="DATA DE ADESÃO" value={fmtDate(u.dataAdesao)} />
          </View>
        </Box>

        {/* Dados do usuário */}
        <Text style={styles.sectionTitle}>DADOS DO USUÁRIO</Text>
        <Box>
          <View style={styles.rowGap}>
            <L label="NOME COMPLETO" value={user.name} strong />
          </View>
          <View style={styles.rowGap}>
            <L label="SEXO" value={labelOf(GENDER_OPTIONS, user.gender)} width={135.4} />
            <L label="DATA DE NASCIMENTO" value={fmtDate(user.birthDate)} width={218.8} />
            <L label="TIPO DEPENDÊNCIA" value={u.tipoDependente} />
          </View>
          <View style={styles.rowGap}>
            <L label="GRAU DE DEPENDÊNCIA" value={u.grauDependencia} width={218.7} />
            <L label="CPF" value={fmtCPF(user.cpf)} />
          </View>
          <View style={styles.rowGap}>
            <L label="ESTADO CIVIL" value={maritalWord(user.maritalStatus, user.gender)} width={161.4} />
            <L label="RG." value={user.rg} width={104.2} />
            <L label="UF RG" value={user.rgIssuer} width={99} />
            <L label="DATA DE EXPEDIÇÃO" value={fmtDate(user.rgIssuedAt)} />
          </View>
          <View style={styles.rowGap}>
            <L label="ESCOLARIDADE" value={labelOf(EDUCATION_OPTIONS, user.educationLevel)} width={244.8} />
            <L label="PROFISSÃO" value={u.profissao} width={171.9} />
            <L label="CNS" value={u.cns} />
          </View>
          <View style={[styles.row, { marginTop: 3 }]}>
            <L label="NOME DA MÃE" value={u.nomeMae} width={302.1} />
            <L label="NATURALIDADE" value={user.birthPlace} />
          </View>
        </Box>

        {/* Endereço do usuário */}
        <Text style={styles.sectionTitle}>ENDEREÇO DO USUÁRIO</Text>
        <Box>
          <View style={styles.row}>
            <L label="CEP" value={addr.cep} width={197.9} />
            <L label="FONE FIXO" value={tel.fixo} width={161.5} />
            <L label="CELULAR" value={tel.celular} />
          </View>
          <L label="ENDEREÇO" value={addr.logradouro} />
          <View style={styles.row}>
            <L label="COMPLEMENTO" value={addr.complemento} width={218.7} />
            <L label="E-MAIL" value={user.email} />
          </View>
          <View style={styles.row}>
            <L label="BAIRRO" value={addr.bairro} width={197.9} />
            <L label="CIDADE" value={addr.cidade} width={161.5} />
            <L label="UF" value={addr.uf} />
          </View>
        </Box>

        {/* Motivo de movimentação */}
        <Text style={styles.sectionTitle}>MOTIVO DE MOVIMENTAÇÃO</Text>
        <Box body={{ paddingTop: 6, paddingBottom: 2.3 }}>
          <L label="MOTIVO" value={u.motivo} />
        </Box>

        <Text style={styles.obsLabel}>
          Observações: <Text style={{ fontSize: BODY, fontFamily: 'Helvetica' }}>{u.obs || ''}</Text>
        </Text>
        <Text style={styles.declara}>
          Declaro sob as penas da Lei, que as informações aqui prestadas são verdadeiras e de minha inteira responsabilidade.
        </Text>

        {/* Data / Assinatura do Titular / Contratante */}
        <View style={styles.signRow}>
          <View style={styles.signCol}>
            <Text style={styles.signLine}> </Text>
            <Text style={styles.signLabel}>Data</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLine}>________________________________</Text>
            <Text style={styles.signLabel}>Assinatura do Titular</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLine}>________________________________</Text>
            <Text style={styles.signLabel}>Contratante</Text>
          </View>
        </View>
        <Text style={styles.warning}>
          O não preenchimento correto dos campos deste instrumento implicará imediatamente em sua devolução.
        </Text>

        {/* Uso exclusivo da Unimed */}
        <Text style={styles.usoTitle}>PARA USO EXCLUSIVO DA UNIMED VALE DO PIQUIRI</Text>
        <View style={[styles.outer, styles.cellRow]}>
          <View style={[styles.inner, styles.usoLeft]}>
            <Text style={styles.times}>{USO_TEXTO}</Text>
          </View>
          <View style={[styles.inner, styles.usoRight]}>
            <Text style={styles.timesRight}>Data de Recebimento:_______/_______/__________</Text>
            <Text style={styles.timesRight}>Recebido por:_________________________</Text>
            <Text style={[styles.timesRight, { marginBottom: 0 }]}>Entregue por:_________________________</Text>
          </View>
        </View>
        <View style={[styles.outer, styles.cellRow, { marginTop: 7.5 }]}>
          <View style={[styles.inner, styles.usoLeft]}>
            <Text style={styles.times}>{USO_TEXTO}</Text>
          </View>
          <View style={[styles.inner, styles.usoRight]}>
            <Text style={styles.timesCenter}>Data de Processamento</Text>
            <Text style={styles.timesRight}>Data Inclusão:_______/_______/__________</Text>
            <Text style={[styles.timesRight, { marginBottom: 0 }]}>Digitado por:_________________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadFichaUnimed(data: FichaData) {
  const blob = await pdf(<FichaUnimedDocument data={data} />).toBlob()
  saveBlob(blob, `ficha-unimed-${fileSlug(data.user.name || 'beneficiario', Infinity)}.pdf`)
}
