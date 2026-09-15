import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { MARITAL_STATUS_OPTIONS, type SelectOption } from '@/lib/user-form-options'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'

// O Termo de adesão precisa do convênio (UnimedDetail) e da pessoa completa
// (UserDataDetail) — a cláusula 2 é preenchida com os dados do SEGUNDO PARCEIRO.
export type TermoData = {
  unimed: UnimedDetail
  user: UserDataDetail
}

const C = { text: '#111', muted: '#555', line: '#333' }

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    color: C.text,
    fontSize: 10,
    lineHeight: 1.5,
  },

  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 20,
    lineHeight: 1.3,
  },

  clause: { marginBottom: 10, textAlign: 'justify' },
  clauseNumber: { fontFamily: 'Helvetica-Bold' },

  // Local e data
  localData: { marginTop: 24, marginBottom: 40, textAlign: 'justify' },

  // Assinaturas (partes)
  signBlock: { marginBottom: 34, alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderColor: C.line, width: '70%', marginBottom: 4 },
  signName: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  signRole: { fontSize: 8.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', marginTop: 2 },

  // Testemunhas
  witnessTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 8, marginBottom: 16 },
  witnessRow: { flexDirection: 'row', justifyContent: 'space-between' },
  witnessCol: { width: '46%' },
  witnessLine: { borderTopWidth: 1, borderColor: C.line, width: '100%', marginBottom: 4 },
  witnessLabel: { fontSize: 8.5, color: C.muted },
})

/** Traduz um valor de enum para o rótulo humano; vazio → string vazia. */
function labelOf(options: SelectOption[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find(o => o.value === value)?.label ?? value
}

/** Junta partes não-vazias com o separador (ignora nulos/vazios). */
function joinParts(parts: (string | null | undefined)[], sep = ', '): string {
  return parts.map(p => (p ?? '').toString().trim()).filter(Boolean).join(sep)
}

/** Monta o endereço da cláusula 2: rua nº, bairro, cidade/UF (pula o que faltar). */
function buildEndereco(addr: {
  street?: string | null
  number?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
} | null): string {
  if (!addr) return ''
  const streetNumber = joinParts([addr.street, addr.number], ' ')
  const cityState = joinParts([addr.city, addr.state], '/')
  return joinParts([streetNumber, addr.neighborhood, cityState], ', ')
}

/** Uma cláusula: número em negrito + texto justificado. */
function Clause({ number, children }: { number: string; children: string }) {
  return (
    <Text style={styles.clause}>
      <Text style={styles.clauseNumber}>{number} – </Text>
      {children}
    </Text>
  )
}

export function TermoUnimedDocument({ data }: { data: TermoData }) {
  const { user } = data
  // Endereço vive na primeira propriedade rural; cai pro endereço legado.
  const addr = user.properties?.[0]?.address ?? user.address ?? null

  // Placeholders da cláusula 2 (nulo → em branco).
  const nome = user.name || ''
  const estadoCivil = labelOf(MARITAL_STATUS_OPTIONS, user.maritalStatus).toLowerCase()
  const rg = user.rg || ''
  const cpf = user.cpf || ''
  const endereco = buildEndereco(addr)

  const clausula2 =
    `${nome}, brasileiro, ${estadoCivil}, portador da Cédula de Identidade sob o nº ${rg}, ` +
    `devidamente inscrito no CPF/MF sob o nº ${cpf}, residente e domiciliado na ${endereco}, ` +
    `na cidade e Comarca de TERRA ROXA (PR), doravante denominado de SEGUNDO PARCEIRO.`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Termo de Adesão ao Contrato de Plano de Saúde</Text>

        <Clause number="CLÁUSULA 1">
          SINDICATO RURAL DE TERRA ROXA, entidade sindical, devidamente inscrita no CNPJ/MF sob o
          nº 77.419.505/0001-10, com sede na Rua José Tondato, 80, na cidade de Terra Roxa (PR),
          doravante denominado de PRIMEIRO PARCEIRO.
        </Clause>

        <Clause number="CLÁUSULA 2">{clausula2}</Clause>

        <Clause number="CLÁUSULA 3">
          Considerando que, o PRIMEIRO PARCEIRO, pactuou contrato de plano de saúde sob o nº 65 de
          forma coletiva por adesão com a UNIMED VALE DO PIQUIRI, Cooperativa de Trabalho Médico Vale
          do Piquiri, inscrita no CNPJ/MF sob o nº 80.525.652/0001-89, operadora com registro na ANS
          308811, com sede na cidade de Palotina (PR).
        </Clause>

        <Clause number="CLÁUSULA 4">
          Considerando que, com a formulação deste contrato o PRIMEIRO PARCEIRO irá proporcionar ao
          SEGUNDO PARCEIRO o pagamento menos oneroso do plano de saúde da empresa UNIMED.
        </Clause>

        <Clause number="CLÁUSULA 5">
          Considerando que, que o SEGUNDO PARCEIRO, tem conhecimento do contato descrito na cláusula
          terceira em suas 41 (quarenta e uma) páginas, pelo qual declara que concorda com todos os
          termos e regras, desta forma as partes assim pactuam:
        </Clause>

        <Clause number="CLÁUSULA 6">
          O PRIMEIRO PARCEIRO não é empresa de gestão de plano de saúde, logo, não tem nenhuma
          responsabilidade pelos atendimentos, procedimentos e coberturas do plano de saúde da UNIMED.
        </Clause>

        <Clause number="CLÁUSULA 7">
          O PRIMEIRO PARCEIRO somente está nesta relação contratual como administrador das mensalidades
          do plano de saúde, ou seja, arrecada valores das mensalidades do SEGUNDO PARCEIRO e repassa os
          valores a operadora UNIMED sem taxa de administração.
        </Clause>

        <Clause number="CLÁUSULA 8">
          O SEGUNDO PARCEIRO, tem conhecimento que a operadora UNIMED fará reajuste anuais no plano de
          saúde, sendo que o PRIMEIRO PARCEIRO não tem nenhuma interferência nestes reajustes.
        </Clause>

        <Clause number="CLÁUSULA 9">
          O SEGUNDO PARCEIRO, tem conhecimento das coberturas e prazos que tem a operadora UNIMED, sendo
          que o PRIMEIRO PARCEIRO, não tem interferência nestes prazos.
        </Clause>

        <Clause number="CLÁUSULA 10">
          O SEGUNDO PARCEIRO deverá efetuar os pagamentos dos boletos ao PRIMEIRO PARCEIRO, rigorosamente
          no prazo estipulado no documento (boleto), não o fazendo automaticamente estará descredenciado
          da operada UNIMED.
        </Clause>

        <Clause number="CLÁUSULA 10.1">
          O SEGUNDO PARCEIRO poderá efetuar o pagamento por meio de debito bancário.
        </Clause>

        <Clause number="CLÁUSULA 10.2">
          Os boletos não pagos e/ou débitos não concretizados, faculta ao PRIMEIRO PARCEIRO a faculdade de
          protestar os valores não pagos acrescidos de multa de 10% e juros legais.
        </Clause>

        <Clause number="CLÁUSULA 11">
          O SEGUNDO PARCEIRO, declara que é responsável financeiro pelos seus dependentes.
        </Clause>

        {/* Local e data */}
        <Text style={styles.localData}>Terra Roxa (PR), _____ de __________ de 20___.</Text>

        {/* Assinaturas das partes */}
        <View style={styles.signBlock} wrap={false}>
          <View style={styles.signLine} />
          <Text style={styles.signName}>SINDICATO RURAL DE TERRA ROXA</Text>
          <Text style={styles.signRole}>Primeiro Parceiro</Text>
        </View>

        <View style={styles.signBlock} wrap={false}>
          <View style={styles.signLine} />
          <Text style={styles.signName}>{nome || ' '}</Text>
          <Text style={styles.signRole}>Segundo Parceiro</Text>
        </View>

        {/* Testemunhas */}
        <Text style={styles.witnessTitle}>Testemunhas</Text>
        <View style={styles.witnessRow} wrap={false}>
          <View style={styles.witnessCol}>
            <View style={styles.witnessLine} />
            <Text style={styles.witnessLabel}>Testemunha</Text>
            <Text style={styles.witnessLabel}>CPF: ______________________</Text>
          </View>
          <View style={styles.witnessCol}>
            <View style={styles.witnessLine} />
            <Text style={styles.witnessLabel}>Testemunha</Text>
            <Text style={styles.witnessLabel}>CPF: ______________________</Text>
          </View>
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

export async function downloadTermoUnimed(data: TermoData) {
  const blob = await pdf(<TermoUnimedDocument data={data} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `termo-unimed-${slug(data.user.name)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
