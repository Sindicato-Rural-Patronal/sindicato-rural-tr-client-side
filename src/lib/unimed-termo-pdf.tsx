import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'
import { resolveAddress, addressInline, fmtCPF, byGender, maritalWord, joinParts } from '@/lib/unimed-pdf-utils'
import { SINDICATO_EMBLEMA_PNG } from '@/lib/unimed-pdf-assets'

// Réplica do "Termo de Adesão ao Contrato de Plano de Saúde" do sistema legado
// (ruraltr.com.br/unimed/termo.php): emblema, título, cláusulas numeradas,
// fecho, data de adesão, assinaturas e testemunhas — só os dados mudam.

// O Termo precisa do convênio (UnimedDetail) e da pessoa completa
// (UserDataDetail) — a cláusula 2 é preenchida com os dados do SEGUNDO PARCEIRO.
export type TermoData = {
  unimed: UnimedDetail
  user: UserDataDetail
}

// Medidas do modelo (pt): corpo Arial 11.2 com passo de linha 12.75; margens 53/52.
const BODY = 11.2
const LH = 12.75 / BODY

const styles = StyleSheet.create({
  // Página 2 do modelo começa em ~73pt; na página 1 o emblema sobe pra 28.5 com margem negativa.
  page: {
    paddingTop: 73, paddingBottom: 60, paddingLeft: 53.2, paddingRight: 52,
    fontFamily: 'Helvetica', fontSize: BODY, lineHeight: LH, color: '#000',
  },
  emblem: { width: 105.75, height: 105.75, alignSelf: 'center', marginTop: -44.5 },
  title: {
    fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 0.4,
    marginTop: 58, marginBottom: 37.5,
  },
  clause: { textAlign: 'justify', marginBottom: 12.75 },
  b: { fontFamily: 'Helvetica-Bold' },
  plain: { marginBottom: 12.75 },

  // Assinaturas das partes
  signBlock: { alignItems: 'center' },
  signLine: { fontSize: BODY },
  signName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 12.5 },
  signInfo: { fontSize: BODY },

  // Testemunhas
  witnessRow: { flexDirection: 'row', marginTop: 141 },
  witnessCol: { width: '50%' },
  witnessLine: { textAlign: 'right', paddingRight: 20, marginBottom: 13 },
  witnessLabel: { fontSize: 8.2, fontFamily: 'Helvetica-Bold' },
})

/** Formata data ISO/`YYYY-MM-DD`; nulo/inválido → string vazia. */
function fmtDate(v: string | null | undefined): string {
  if (!v) return ''
  return formatDateFromString(v)
}

/** Data de hoje em DD/MM/YYYY (fallback quando não há data de adesão). */
function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Cláusula numerada: "N." em negrito (+ trecho em negrito opcional) e texto justificado. */
function Clause({ n, bold, children }: { n: string; bold?: string; children: string }) {
  return (
    <Text style={styles.clause}>
      <Text style={styles.b}>{n}{bold ? ` ${bold}` : ''}</Text>
      {bold ? '' : ' '}{children}
    </Text>
  )
}

export function TermoUnimedDocument({ data }: { data: TermoData }) {
  const { unimed: u, user } = data
  const g = user.gender

  // Placeholders da cláusula 2 (nulo → em branco), com concordância de gênero.
  const nome = user.name || ''
  const rg = joinParts([user.rg, user.rgIssuer], '-')
  const cpf = fmtCPF(user.cpf)
  const endereco = addressInline(resolveAddress(user))
  const dataTermo = fmtDate(u.dataAdesao) || today()

  const qualificacao = joinParts([
    byGender(g, 'brasileiro', 'brasileira'),
    maritalWord(user.maritalStatus, g),
    `${byGender(g, 'portador', 'portadora')} da Cédula de Identidade sob o nº ${rg}`,
    `devidamente ${byGender(g, 'inscrito', 'inscrita')} no CPF/MF sob o nº ${cpf}`,
  ])
  const residencia = endereco
    ? `residente e ${byGender(g, 'domiciliado', 'domiciliada')} na ${endereco}, na cidade e Comarca de Terra Roxa (PR)`
    : `residente e ${byGender(g, 'domiciliado', 'domiciliada')} na cidade e Comarca de Terra Roxa (PR)`
  const clausula2 = `, ${qualificacao}, ${residencia}, doravante ${byGender(g, 'denominado', 'denominada')} de SEGUNDO PARCEIRO.`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={SINDICATO_EMBLEMA_PNG} style={styles.emblem} />
        <Text style={styles.title}>TERMO DE ADESÃO AO CONTRATO DE PLANO DE SAÚDE</Text>

        <Clause n="1." bold="SINDICATO RURAL DE TERRA ROXA">
          , entidade sindical, devidamente inscrita no CNPJ/MF sob o nº 77.419.505/0001-10, com sede na Rua José Tondato, 80, na cidade de Terra Roxa (PR), doravante denominado de PRIMEIRO PARCEIRO.
        </Clause>
        <Clause n="2." bold={nome}>{clausula2}</Clause>
        <Clause n="3." bold="Considerando que">
          , o PRIMEIRO PARCEIRO, pactuou contrato de plano de saúde sob o nº 65 de forma coletiva por adesão com a UNIMED VALE DO PIQUIRI, Cooperativa de Trabalho Médico Vale do Piquiri, inscrita no CNPJ/MF sob o nº 80.525.652/0001-89, operadora com registro na ANS 308811, com sede na cidade de Palotina (PR).
        </Clause>
        <Clause n="4." bold="Considerando que">
          , com a formulação deste contrato o PRIMEIRO PARCEIRO irá proporcionar ao SEGUNDO PARCEIRO o pagamento menos oneroso do plano de saúde da empresa UNIMED.
        </Clause>
        <Clause n="5." bold="Considerando que">
          , que o SEGUNDO PARCEIRO, tem conhecimento do contato descrito na cláusula terceira em suas 41 (quarenta e uma) páginas, pelo qual declara que concorda com todos os termos e regras, desta forma as partes assim pactuam:
        </Clause>
        <Clause n="6.">
          O PRIMEIRO PARCEIRO não é empresa de gestão de plano de saúde, logo, não tem nenhuma responsabilidade pelos atendimentos, procedimentos e coberturas do plano de saúde da UNIMED.
        </Clause>
        <Clause n="7.">
          O PRIMEIRO PARCEIRO somente está nesta relação contratual como administrador das mensalidades do plano de saúde, ou seja, arrecada valores das mensalidades do SEGUNDO PARCEIRO e repassa os valores a operadora UNIMED sem taxa de administração.
        </Clause>
        <Clause n="8.">
          O SEGUNDO PARCEIRO, tem conhecimento que a operadora UNIMED fará reajuste anuais no plano de saúde, sendo que o PRIMEIRO PARCEIRO não tem nenhuma interferência nestes reajustes.
        </Clause>
        <Clause n="9.">
          O SEGUNDO PARCEIRO, tem conhecimento das coberturas e prazos que tem a operadora UNIMED, sendo que o PRIMEIRO PARCEIRO, não tem interferência nestes prazos.
        </Clause>
        <Clause n="10.">
          O SEGUNDO PARCEIRO deverá efetuar os pagamentos dos boletos ao PRIMEIRO PARCEIRO, rigorosamente no prazo estipulado no documento (boleto), não o fazendo automaticamente estará descredenciado da operada UNIMED.
        </Clause>
        <Clause n="10.1.">
          O SEGUNDO PARCEIRO poderá efetuar o pagamento por meio de debito bancário.
        </Clause>
        <Clause n="10.2.">
          Os boletos não pagos e/ou débitos não concretizados, faculta ao PRIMEIRO PARCEIRO a faculdade de protestar os valores não pagos acrescidos de multa de 10% e juros legais.
        </Clause>
        <Clause n="11.">
          O SEGUNDO PARCEIRO, declara que é responsável financeiro pelos seus dependentes
        </Clause>

        <Text style={[styles.plain, { textAlign: 'justify' }]}>
          E, por ser expressão da verdade, firmo o presente em 2 (duas) vias de igual forma e teor, conforme termo de ciência e consentimento.
        </Text>
        <Text style={styles.plain}>Terra Roxa (PR), em {dataTermo}</Text>

        {/* Assinaturas das partes */}
        <View style={[styles.signBlock, { marginTop: 140 }]} wrap={false}>
          <Text style={styles.signLine}>________________________________________</Text>
          <Text style={styles.signName}>SINDICATO RURAL DE TERRA ROXA</Text>
          <Text style={styles.signInfo}>CNPJ/MF 77.419.505/0001-10</Text>
          <Text style={styles.signInfo}>PRIMEIRO PARCEIRO</Text>
        </View>
        <View style={[styles.signBlock, { marginTop: 82 }]} wrap={false}>
          <Text style={styles.signLine}>________________________________________</Text>
          <Text style={styles.signName}>{nome || ' '}</Text>
          <Text style={styles.signInfo}>CPF/MF {cpf}</Text>
          <Text style={styles.signInfo}>SEGUNDO PARCEIRO</Text>
        </View>

        {/* Testemunhas */}
        <View style={styles.witnessRow} wrap={false}>
          <View style={styles.witnessCol}>
            <Text style={styles.witnessLine}>
              <Text style={styles.witnessLabel}>TESTEMUNHA 1:</Text>________________________
            </Text>
            <Text style={styles.witnessLine}>
              <Text style={styles.witnessLabel}>CPF Nº:</Text>________________________
            </Text>
          </View>
          <View style={styles.witnessCol}>
            <Text style={[styles.witnessLine, { paddingRight: 12 }]}>
              <Text style={styles.witnessLabel}>TESTEMUNHA 2:</Text>________________________
            </Text>
            <Text style={[styles.witnessLine, { paddingRight: 12 }]}>
              <Text style={styles.witnessLabel}>CPF Nº:</Text>________________________
            </Text>
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
