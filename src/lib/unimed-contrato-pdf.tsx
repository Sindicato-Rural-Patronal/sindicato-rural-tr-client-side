import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'
import { fmtCPF } from '@/lib/unimed-pdf-utils'
import { UNIMED_LOGO_PNG } from '@/lib/unimed-pdf-assets'

// Réplica do "Termo de Ciência e Consentimento" do sistema legado
// (ruraltr.com.br/unimed/press.php) — o documento que a tela chama de Contrato.
// O texto é integralmente fixo (cláusulas da Unimed Vale do Piquiri); só variam
// o nome e o CPF do beneficiário, na abertura e na assinatura, e a data.
//
// O texto legal é reproduzido literalmente, inclusive onde o original tem erro
// de digitação ("CONTRATAO") ou cita a ACIPA, para não alterar um documento que
// o sindicato já entrega assinado.

export type ContratoData = {
  unimed: UnimedDetail
  user: UserDataDetail
}

// Medidas do modelo (pt): corpo Arial 10.5 com passo de linha 12; margens 53/52.
const BODY = 10.5
const LH = 12 / BODY

const styles = StyleSheet.create({
  page: {
    paddingTop: 140, paddingBottom: 78, paddingLeft: 53.2, paddingRight: 52,
    fontFamily: 'Helvetica', fontSize: BODY, lineHeight: LH, color: '#000',
  },
  // Logo repetido no topo direito de todas as páginas.
  logo: { position: 'absolute', top: 28.5, right: 52, width: 159, height: 73.5 },
  // "De acordo: ____" no rodapé de todas as páginas — é onde o beneficiário
  // rubrica. No modelo legado ele aparece nas 5 páginas (nas quatro primeiras no
  // pé, na última no alto, por transbordo do print). Deixar em todas é fiel ao
  // uso e evita o `render` condicional por página, que o react-pdf não resolve
  // neste documento (totalPages não chega ao callback).
  deAcordo: { position: 'absolute', bottom: 64, left: 53.2, fontSize: BODY },

  title: { fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 33 },
  p: { textAlign: 'justify', marginBottom: 10.5 },
  item: { textAlign: 'justify', marginBottom: 10.5, marginLeft: 30 },
  sub: { textAlign: 'justify', marginBottom: 12.8, marginLeft: 30 },
  subG: { textAlign: 'justify', marginBottom: 12.8, marginLeft: 19.6 },
  subQ: { textAlign: 'justify', marginBottom: 2.2, marginLeft: 44.1 },
  b: { fontFamily: 'Helvetica-Bold' },

  // Caixa "Solicito uma cópia do CONTRATO…"
  caixa: {
    borderWidth: 1, borderColor: '#000', borderStyle: 'solid',
    marginTop: 58, marginBottom: 40, paddingVertical: 14, paddingHorizontal: 20,
  },
  caixaTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', lineHeight: 17.3 / 12 },
  caixaOpcoes: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', marginTop: 14 },

  // Assinaturas
  assinatura: { marginTop: 53 },
  linha: { marginBottom: 0 },
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

/** Texto em negrito dentro de um parágrafo. */
function B({ children }: { children: string }) {
  return <Text style={styles.b}>{children}</Text>
}

export function ContratoUnimedDocument({ data }: { data: ContratoData }) {
  const { unimed: u, user } = data
  const nome = user.name || ''
  const cpf = fmtCPF(user.cpf)
  const dataDoc = fmtDate(u.dataAdesao) || today()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={UNIMED_LOGO_PNG} style={styles.logo} fixed />
        <Text style={styles.deAcordo} fixed>De acordo: __________________________</Text>

        <Text style={styles.title}>TERMO DE CIÊNCIA E CONSENTIMENTO</Text>

        <Text style={[styles.p, { marginBottom: 33 }]}>
          Eu, <B>{`${nome},`}</B> portador do <B>{`CPF nº ${cpf}`}</B>, atesto que fui devidamente
          informado (a) e orientado pela <B>SINDICATO RURAL DE TERRA ROXA </B>- sobre as regras de
          funcionamento do Plano de Saúde Unimed contratado junto Unimed Vale do Piquiri, operadora
          de Plano de Saúde registrada na ANS – 30881-1.
        </Text>

        <Text style={[styles.p, { marginBottom: 33 }]}><B>Tenho conhecimento que:</B></Text>

        <Text style={styles.item}>
          a) As coberturas do Plano de Saúde estão baseadas na Lei nº 9.656/98 e no Rol de
          Procedimentos e Eventos em Saúde da Agência Nacional de Saúde Suplementar vigente na data
          do atendimento.
        </Text>
        <Text style={styles.item}>
          b) Os serviços do Plano de Saúde serão prestados em todo o território Nacional pela Rede
          Credenciada Unimed, através do Sistema de Intercâmbio Nacional Unimed, que está disponível
          no portal Unimed no endereço: www.unimed.coop.br/valedopiquiri.
        </Text>
        <Text style={styles.item}>
          c) Os beneficiários inscritos no Plano de Saúde receberão um Cartão Magnético de
          Identificação válido, que é indispensável sua apresentação para a realização dos
          atendimentos através do Plano de Saúde Unimed, juntamente com o documento de identidade.
        </Text>
        <Text style={[styles.item, styles.b]}>
          d) É de minha responsabilidade o uso correto do cartão de identificação Unimed, e a
          utilização do mesmo por terceiros é fraude, tal atitude sujeita à suspensão dos direitos
          de atendimentos.
        </Text>
        <Text style={styles.item}>
          e) Nos atendimentos de <B>urgência e emergência é obrigatório</B> a apresentação do cartão
          de identificação.
        </Text>
        <Text style={styles.item}>
          f) Os exames complementares e serviços auxiliares devem ser realizados nos prestadores de
          serviços que integram a rede prestadora de serviços da Operadora Contratada.
        </Text>
        <Text style={styles.item}>
          g) Em caso de dificuldade para agendamento de consultas e procedimentos, o usuário deve
          entrar em contato com a Unimed Vale do Piquiri através do SAC – 0800 41 45 54 ou telefone
          – 44 3649 5251, ramal – 1, para buscar agilidade em seu atendimento.
        </Text>
        <Text style={styles.item}>
          h) Cabe ao beneficiário (ou quem responda por ele) providenciar a autorização prévia para
          atendimento eletivo, seja exame, procedimentos ou cirurgias.
        </Text>
        <Text style={styles.item}>
          i) Os serviços diagnósticos, tratamentos e demais procedimentos ambulatoriais tem que ser
          solicitados pelo médico e devem ser<B> submetidos à autorização prévia.</B>
        </Text>
        <Text style={styles.item}>
          j) Quando houver solicitação de procedimentos clínicos, cirúrgicos ou terapias, a Unimed
          Vale do Piquiri reserva-se a seu critério, o direito de exigir a realização de terceira
          opinião (conforme Resolução Normativa nº 424/2017 da ANS – Agência Nacional de Saúde
          Suplementar).
        </Text>
        <Text style={[styles.item, styles.b]}>
          k) A Unimed Vale do Piquiri não se responsabilizará pelo pagamento de quaisquer serviços
          eventualmente utilizados fora da forma contratada, ou por qualquer acordo ajustado
          particularmente pelos beneficiários com médicos, hospitais ou entidades, contratados ou
          não.
        </Text>
        <Text style={[styles.item, { marginBottom: 33 }]}>
          l) É garantido ao Beneficiário o reembolso das despesas decorrentes dos atendimentos de{' '}
          <B>urgência e emergência</B> ocorridos na área de abrangência geográfica da cobertura
          contratual sempre que <B>não for possível a utilização dos serviços de prestadores da rede</B>{' '}
          Unimed.
        </Text>

        <Text style={[styles.p, styles.b, { marginBottom: 33 }]}>
          PARA MINHA MELHOR COMPREENSÃO, SEGUE ABAIXO TRANSCRITA A CLÁUSULA - IV EXCLUSÕES DE
          COBERTURA DO CONTRATO QUE ESTOU ADERINDO.
        </Text>

        <Text style={[styles.p, styles.b]}>“IV - EXCLUSÕES DE COBERTURA.</Text>

        <Text style={[styles.p, styles.b]}>
          Informamos que a presente cláusula está redigida de acordo com o § 4º do art. 54., Lei nº
          8.078/1990 - Código de defesa do Consumidor, o mesmo prevê que as cláusulas que implicam
          em limitação de direito devem estar redigidas em destaque para imediata e fácil
          compreensão.
        </Text>
        <Text style={[styles.p, styles.b]}>
          4.1. Com vista ao disposto no art. 10 da Lei 9.656/98 e Rol de Procedimentos da Agência
          Nacional de Saúde Suplementar e suas atualizações atendidas as Diretrizes de Utilização
          para Cobertura de Procedimentos na Saúde Suplementar, respeitadas as coberturas mínimas
          obrigatórias, estão previstas as seguintes exclusões de cobertura do plano ora pactuado,
          conforme definições legais abaixo transcritas:
        </Text>

        <Text style={[styles.item, styles.b, { marginBottom: 22.5 }]}>
          a) Tratamento clínico ou cirúrgico experimental:
        </Text>
        <Text style={[styles.sub, styles.b]}>
          a.1. Os tratamentos que empregam medicamentos, produtos para a saúde ou técnicas não
          registradas ou regularizadas no país.
        </Text>
        <Text style={[styles.sub, styles.b]}>
          a.2. Os tratamentos considerados experimentais pelo Conselho Federal de Medicina - CFM
          e/ou Conselho Federal de Odontologia – CFO.
        </Text>
        <Text style={[styles.sub, styles.b, { marginBottom: 38.1 }]}>
          a.3. Os medicamentos e materiais cujas indicações não constem na bula registrada na ANVISA
          (uso off-label).
        </Text>

        <Text style={[styles.p, styles.b]}>
          b) Procedimentos clínicos, cirúrgicos, órteses e próteses, para fins estéticos, sendo
          entendido como procedimento estético aquele que não visa restaurar função parcial ou total
          de órgão ou parte do corpo humano lesionada, seja por enfermidade, traumatismo ou anomalia
          congênita;
        </Text>
        <Text style={[styles.p, styles.b]}>
          c) Inseminação artificial: técnica de reprodução assistida que inclui a manipulação de
          oócitos e esperma para alcançar a fertilização, por meio de injeções de esperma
          intracitoplasmáticas, transferência intrafalopiana de gameta, doação de oócitos, indução
          da ovulação, concepção póstuma, recuperação espermática ou transferência intratubária do
          zigoto, entre outras técnicas;
        </Text>
        <Text style={[styles.p, styles.b]}>
          d) Tratamento clinico ou cirúrgico de rejuvenescimento ou de emagrecimento com finalidade
          estética;
        </Text>
        <Text style={[styles.p, styles.b]}>
          e) Fornecimento de medicamentos e produtos para a saúde importados não nacionalizados,
          entendidos como aqueles produzidos fora do território nacional e sem registro vigente na
          Agência Nacional de Vigilância Sanitária – ANVISA;
        </Text>
        <Text style={[styles.p, styles.b]}>
          f) Taxas, materiais, contrastes, medicamentos, entre outros, que não estejam regularizados,
          nem registrados e suas indicações não constem na bula/manual junto à Agência Nacional de
          Vigilância Sanitária – ANVISA;
        </Text>
        <Text style={[styles.p, styles.b, { marginBottom: 20.5 }]}>
          g) Fornecimento de próteses, órteses e seus acessórios não ligados ao ato cirúrgico:
        </Text>
        <Text style={[styles.subG, styles.b]}>
          g.1. prótese, é qualquer material permanente ou transitório que substitua total ou
          parcialmente um membro, órgão ou tecido, e
        </Text>
        <Text style={[styles.subG, styles.b, { marginBottom: 23.8 }]}>
          g.2. órtese, qualquer material permanente ou transitório, incluindo materiais de
          osteossíntese, que auxilie as funções de um membro, órgão ou tecido e que, não sendo
          ligados ao ato cirúrgico aqueles dispositivos e cuja colocação ou remoção não requeiram a
          realização de ato cirúrgico;
        </Text>
        <Text style={[styles.p, styles.b]}>
          h) Tratamentos ilícitos ou antiéticos, assim definidos sob o aspecto médico, ou não
          reconhecidos pelas autoridades competentes;
        </Text>
        <Text style={[styles.p, styles.b]}>
          i) Casos de cataclismos, guerras e comoções internas, quando declarados pela autoridade
          competente;
        </Text>
        <Text style={[styles.p, styles.b]}>
          j) Transplantes, autotransplantes e implantes e as despesas deles decorrentes, com exceção
          daqueles constantes no Rol de Procedimentos e Eventos em Saúde da Agência Nacional de
          Saúde Suplementar em vigor na data de utilização do Plano de Saúde;
        </Text>
        <Text style={[styles.p, styles.b]}>k) Consultas e demais atendimentos domiciliares;</Text>
        <Text style={[styles.p, styles.b]}>l) Realização de parto domiciliar;</Text>
        <Text style={[styles.p, styles.b]}>m) Home Care;</Text>
        <Text style={[styles.p, styles.b]}>
          n) Despesas de alimentação domiciliar, mesmo de nutrição enteral ou parenteral;
        </Text>
        <Text style={[styles.p, styles.b]}>
          o) Aluguel de equipamentos hospitalares e similares, seja em regime hospitalar ou
          domiciliar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          p) Enfermagem em caráter particular, seja em regime hospitalar ou domiciliar;
        </Text>
        <Text style={[styles.p, styles.b, { marginBottom: 10 }]}>
          q) Remoção domiciliar (exceto as remoções que estejam contempladas pelas Resolução do
          CONSU nº 13/1998 e Resolução Normativa nº 347/2017 da ANS – Agência Nacional de Saúde
          Suplementar)
        </Text>
        <Text style={[styles.subQ, styles.b]}>q.1.) transporte de hospital para domicílio,</Text>
        <Text style={[styles.subQ, styles.b]}>q.2.) transporte de domicílio para hospital,</Text>
        <Text style={[styles.subQ, styles.b]}>
          q.3.) transporte de domicílio para realização de exame, e
        </Text>
        <Text style={[styles.subQ, styles.b, { marginBottom: 13.3 }]}>
          q.4.) transporte de domicílio para consultório médico;
        </Text>
        <Text style={[styles.p, styles.b]}>
          r) Tratamento em clínicas de emagrecimento, clínicas de repouso, de cuidados terminais,
          spas, estâncias hidrominerais, estabelecimentos para acolhimento de idosos e internações
          que não necessitem de cuidados médicos em ambiente hospitalar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          s) Quaisquer tratamentos odontológicos passíveis de realização em consultório, com exceção
          da estrutura hospitalar necessária à realização dos procedimentos odontológicos passíveis
          de realização em consultório, mas que, por imperativo clínico, necessitem de internação
          hospitalar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          t) Quaisquer tratamentos odontológicos cirúrgicos, exceto às cirurgias buco-maxilo-faciais
          constantes no Rol de Procedimentos e Eventos em Saúde da Agência Nacional de Saúde
          Suplementar em vigor na data de utilização atendidas as Diretrizes de Utilização para
          Cobertura de Procedimentos na Saúde Suplementar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          u) Todos os procedimentos terapêuticos, médicos e hospitalares não listados no Rol de
          Procedimentos e Eventos em Saúde da Agência Nacional de Saúde Suplementar em vigor na data
          de utilização atendidas as Diretrizes de Utilização para Cobertura de Procedimentos na
          Saúde Suplementar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          v) Os procedimentos realizados por laser, radiofrequência, robótica, neuronavegação ou
          outro sistema de navegação, escopias e técnicas minimamente invasivas, quando a respectiva
          técnica não estiver assim especificada no Rol de Procedimentos e Eventos em Saúde da
          Agência Nacional de Saúde Suplementar em vigor na data de utilização do Plano de Saúde
          atendidas as Diretrizes de Utilização para Cobertura de Procedimentos na Saúde
          Suplementar;
        </Text>
        <Text style={[styles.p, styles.b]}>
          w) Fornecimento de medicamentos para tratamento domiciliar, vacinas preventivas,
          imunoterapia alérgica, dietas e todos aqueles cujo uso não é exclusivamente hospitalar,
          podendo ser adquiridos por pessoas físicas em farmácias de acesso ao público e
          administrados em ambiente externo ao ambiente hospitalar (clínicas, ambulatórios),
          excetuados os medicamentos previstos na alínea “c” e “d” do item 3.3.16 da Cláusula III -
          COBERTURAS E PROCEDIMENTOS GARANTIDOS;
        </Text>
        <Text style={[styles.p, styles.b]}>
          x) Serviços telefônicos ou qualquer outra despesa extraordinária, realizados pelo
          beneficiário internado ou seu acompanhante, como por exemplo, medicamentos não prescritos
          pelo médico assistente durante os internamentos cobertos;
        </Text>
        <Text style={[styles.p, styles.b]}>
          y) Consulta médica cuja especialidade não seja reconhecida pelo Conselho Federal de
          Medicina;
        </Text>
        <Text style={[styles.p, styles.b]}>
          z) Atendimentos prestados antes do início da vigência contratual ou do cumprimento dos
          prazos de carências ou prestados em desacordo com o estabelecido neste contrato;
        </Text>
        <Text style={[styles.p, styles.b]}>aa) Instrumentação Cirúrgica; e</Text>
        <Text style={[styles.p, styles.b, { marginBottom: 33 }]}>
          bb) Exames ligados a Legislação Trabalhista: exames médicos admissionais, periódicos, de
          retorno ao trabalho, de mudança de função e demissionais.”
        </Text>

        <Text style={[styles.p, styles.b]}>
          DECLARO QUE LI E ESTOU CIENTE QUE O PLANO DE SAÚDE QUE ESTOU ADERINDO NÃO CONTEMPLA
          ALGUMAS COBERTURAS, EXISTINDO EXCLUSÕES DE SERVIÇOS, AS QUAIS CONSTANTES NA CLÁUSULA IV -
          EXCLUSÕES DE COBERTURA.
        </Text>
        <Text style={[styles.p, styles.b]}>
          DECLARO ESTAR CIENTE QUE CONSTA NO CONTRATAO CELEBRADO ENTRE A UNIMED VALE DO PIQUIRI E A
          ACIPA, NA CLÁUSULA XVIII – DISPOSIÇÕES GERAIS NO ITEM 18.9, LISTA DE HOSPITAIS NÃO
          CREDENCIADOS AO PLANO DE SAÚDE, INCLUSIVE NO ATENDIMENTO DE URGÊNCIA E EMERGÊNCIA, A LISTA
          ESTÁ DISPONIBILIZADA NO SITO DA INTERNET www.unimed.coop.br/valedopiquiri.
        </Text>
        <Text style={[styles.p, styles.b]}>
          DECLARO ESTAR CIENTE E NÃO TENHO QUALQUER DÚVIDA A RESPEITO, EXARANDO MINHA CONCORDÂNCIA,
          FICANDO, DE ORA EM DIANTE, VEDADA QUALQUER DISCUSSÃO ACERCA DO CONTIDO NO CONTRATO QUE É
          REALIZADO DENTRO DOS PARÂMETROS LEGAIS DA LEGISLAÇÃO VIGENTE QUE TRATO DO ASSUNTO.
        </Text>

        <View style={styles.caixa}>
          <Text style={styles.caixaTexto}>
            Solicito uma cópia do CONTRATO celebrado entre o Sindicato Rural de Terra Roxa e a
            Unimed Vale do Piquiri:
          </Text>
          <Text style={styles.caixaOpcoes}>(      ) SIM                    (      ) NÃO</Text>
        </View>

        <Text style={[styles.p, styles.b]}>
          A minha adesão ao contrato expressa satisfação com o produto que me está sendo ofertado,
          não cabendo pleitear judicialmente quaisquer dos itens expressos como não cobertos,
          conforme bem delimitado no contrato. A Unimed Vale do Piquiri presta os serviços ora
          contratados em território nacional, pelos médicos cooperados, serviços próprios,
          contratados ou credenciados da Operadora Contratada ou das cooperativas associadas a esta,
          através do Sistema de Intercâmbio Nacional Unimed.
        </Text>
        <Text style={styles.p}>E por ser a expressão da verdade firmo a presente.</Text>
        <Text style={styles.p}>Terra Roxa, {dataDoc}</Text>

        <View style={styles.assinatura} wrap={false}>
          <Text style={styles.linha}>_____________________________________</Text>
          <Text style={styles.b}>{nome || ' '}</Text>
          <Text style={styles.b}>CPF - {cpf}</Text>
        </View>
        <View style={[styles.assinatura, { marginTop: 33 }]} wrap={false}>
          <Text style={styles.linha}>_____________________________________</Text>
          <Text style={styles.b}>SINDICATO RURAL DE TERRA ROXA</Text>
          <Text>CNPJ – 77.419.505/0001-10</Text>
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

export async function downloadContratoUnimed(data: ContratoData) {
  const blob = await pdf(<ContratoUnimedDocument data={data} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contrato-unimed-${slug(data.user.name)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
