import type { Empenho, FinanceType } from '@/hooks/useFinance'
import type { OrgInfo } from '@/hooks/useSiteSettings'
import { valorPorExtensoLegado } from '@/lib/extenso-legado'
import { fornecedorDoLancamento } from '@/lib/relatorio-empenho'
import { ORG_CONTACT, orgAddressLines } from '@/lib/org-contact'
import { fileSlug } from '@/utils/download'
import { centsToBRL, maskCNPJ, maskCPF } from '@/utils/masks'

// Recibo de entrada do Financeiro (SR-065, F4): "recibos de empresas que pagam algo
// para o sindicato, puxando os dados do sistema". O desenho é PADRÃO: o cliente ainda
// vai mandar o modelo que usa hoje. Para ajustar, os TEXTOS ficam aqui
// (RECIBO_TEXTOS) e os ESTILOS no topo de `recibo-pdf.tsx` (ESTILO).
//
// Tudo neste arquivo é puro (sem React, sem PDF): quem pode ter recibo, de quem o
// sindicato recebeu e o texto da frase. O `recibo-pdf.tsx` só desenha o que sai daqui.

/** Todos os textos fixos do recibo, num lugar só. */
export const RECIBO_TEXTOS = {
  titulo: 'RECIBO',
  /** Rótulo do quadro do número (só aparece com o número do lançamento). */
  numero: 'Nº',
  valor: 'VALOR',
  /** Cabeçalho do documento (o mesmo do relatório de despesas). */
  cabecalho: 'SINDICATO RURAL DE TERRA ROXA / PR',
  /** Quem assina, embaixo da linha. */
  sindicato: 'Sindicato Rural de Terra Roxa',
  assinatura: 'Assinatura do responsável',
  formaDePagamento: 'Forma de pagamento',
  /** Frase: "Recebemos de <quem>, a importância de <valor> (<extenso>), referente a <descrição>." */
  recebemos: 'Recebemos',
  de: ' de ',
  importancia: ' a importância de ',
  referente: ' referente a ',
  /** Texto do botão (title e aria-label) na lista do Financeiro. */
  botao: 'Gerar recibo em PDF',
  /** Aviso quando o PDF não sai. */
  erro: 'Erro ao gerar o recibo.',
} as const

/**
 * O que o recibo lê do lançamento. `number` é o Nº do lançamento (a API ganha o campo
 * na SR-064): enquanto ele não vier no objeto, o quadro do número não aparece.
 */
export type ReciboData = {
  type: FinanceType | null
  transferId?: string | null
  amountCents: number
  /** ISO ou AAAA-MM-DD; vale o dia escrito, sem fuso. */
  date: string
  description: string
  /** Forma de pagamento (texto). */
  method?: string | null
  number?: number | null
  /** De onde vêm os dados de quem pagou (os mesmos da Nota de Empenho). */
  empenho?: Empenho | null
}

/** Quem emite o recibo: os dados do sindicato no cabeçalho, a cidade do "local e data". */
export type EmissorRecibo = {
  nome: string
  cnpj: string
  linhasEndereco: string[]
  telefone: string
  cidade: string
}

/** Um pedaço da frase do recibo; o `negrito` marca nome, documento, valor e descrição. */
export type Trecho = { texto: string; negrito?: boolean }

/** O recibo já com todos os textos prontos: o PDF só desenha. */
export type ReciboPronto = {
  /** "123", ou null sem número. */
  numero: string | null
  /** "R$ 1.234,56" */
  valor: string
  trechos: Trecho[]
  /** "Forma de pagamento: PIX", ou null sem forma. */
  formaDePagamento: string | null
  /** "Terra Roxa, 30 de outubro de 2026" */
  localEData: string
}

/** Só entrada de caixa tem recibo: sai de fora saída, "só nota" (type null) e a perna de entrada de uma transferência. */
export function podeGerarRecibo(t: Pick<ReciboData, 'type' | 'transferId'>): boolean {
  return t.type === 'IN' && !t.transferId
}

/** O documento com rótulo certo e máscara: 11 dígitos é CPF, 14 é CNPJ; outro tamanho vai como foi digitado. Sem dígitos, null. */
export function documentoDoPagador(bruto: string | null | undefined): { rotulo: string; valor: string } | null {
  const texto = (bruto ?? '').trim()
  const digitos = texto.replace(/\D/g, '')
  if (!digitos) return null
  if (digitos.length === 11) return { rotulo: 'CPF', valor: maskCPF(digitos) }
  if (digitos.length === 14) return { rotulo: 'CNPJ', valor: maskCNPJ(digitos) }
  return { rotulo: 'CNPJ/CPF', valor: texto }
}

/** "Rua X, 12, Centro, Terra Roxa/PR, CEP 85990-000", pulando o que estiver vazio. */
export function enderecoDoPagador(e: Empenho | null | undefined): string | null {
  if (!e) return null
  const limpo = (v?: string) => (v ?? '').trim()
  const cidadeUf = [limpo(e.cidade), limpo(e.uf)].filter(Boolean).join('/')
  const cep = limpo(e.cep)
  const partes = [limpo(e.endereco), limpo(e.bairro), cidadeUf, cep ? `CEP ${cep}` : ''].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : null
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-10-30" (ou ISO) → "30 de outubro de 2026"; dia 1 vai como "1º". Sem fuso: vale o dia escrito. Data inválida → "". */
export function dataPorExtenso(date: string): string {
  const [ano, mes, dia] = (date ?? '').slice(0, 10).split('-').map(Number)
  if (!ano || !mes || !dia || mes < 1 || mes > 12) return ''
  return `${dia === 1 ? '1º' : dia} de ${MESES[mes - 1]} de ${ano}`
}

/** O número do lançamento como aparece no recibo, ou null quando o lançamento não tem. */
export function numeroDoRecibo(t: Pick<ReciboData, 'number'>): string | null {
  const n = t.number
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? String(n) : null
}

/** De quem o sindicato recebeu: nome (razão social ou, sem ela, o nome fantasia — o mesmo da coluna "Nome / Razão social"), documento e endereço. */
export function pagadorDoRecibo(t: Pick<ReciboData, 'empenho'>) {
  return {
    nome: fornecedorDoLancamento(t),
    documento: documentoDoPagador(t.empenho?.cnpjCpf),
    endereco: enderecoDoPagador(t.empenho),
  }
}

/**
 * A frase do recibo:
 * "Recebemos de **NOME**, CNPJ **00.000.000/0000-00**, endereço, a importância de **R$ 1.234,56**
 * (UM MIL ... CENTAVOS), referente a **DESCRIÇÃO**."
 * Sem nome, sem documento ou sem os dois a frase se adapta, sem vírgula solta; o endereço só entra
 * quando há nome ou documento (sozinho ele não diz quem pagou).
 *
 * A pontuação vai grudada no trecho que vem antes dela (a vírgula depois do nome sai em negrito
 * junto com ele). Se ela abrisse um trecho novo, o PDF poderia quebrar a linha entre a palavra e a
 * vírgula e enfiar um hífen no fim da linha.
 */
export function trechosDoRecibo(t: ReciboData): Trecho[] {
  const { nome, documento, endereco } = pagadorDoRecibo(t)
  const trechos: Trecho[] = []
  /** Texto novo; junta com o trecho anterior quando o estilo é o mesmo. */
  const add = (texto: string, negrito = false) => {
    const ultimo = trechos[trechos.length - 1]
    if (ultimo && !!ultimo.negrito === negrito) ultimo.texto += texto
    else trechos.push(negrito ? { texto, negrito } : { texto })
  }
  /** Pontuação: cola no fim do trecho anterior, seja qual for o estilo dele. */
  const pontuar = (texto: string) => { trechos[trechos.length - 1].texto += texto }

  add(RECIBO_TEXTOS.recebemos)
  const quem: Array<() => void> = []
  if (nome) quem.push(() => add(nome, true))
  if (documento) quem.push(() => { add(`${documento.rotulo} `); add(documento.valor, true) })
  if (endereco && quem.length > 0) quem.push(() => add(endereco))
  if (quem.length > 0) {
    add(RECIBO_TEXTOS.de)
    quem.forEach((parte, i) => {
      if (i > 0) add(' ')
      parte()
      pontuar(',')
    })
  }

  add(RECIBO_TEXTOS.importancia)
  add(centsToBRL(t.amountCents), true)
  add(` (${valorPorExtensoLegado(t.amountCents)})`)

  // Sem ponto final repetido: a descrição às vezes já vem com ele.
  const descricao = (t.description ?? '').trim().replace(/[.\s]+$/, '')
  if (descricao) {
    pontuar(',')
    add(RECIBO_TEXTOS.referente)
    add(descricao, true)
  }
  pontuar('.')
  return trechos
}

/** Os trechos juntos, sem negrito (a frase como texto corrido). */
export function textoPlano(trechos: readonly Trecho[]): string {
  return trechos.map(t => t.texto).join('')
}

/** Os dados do sindicato para o cabeçalho, a partir das Configurações (`useOrgInfo`). O CNPJ não tem campo lá: vem de `ORG_CONTACT`, como no relatório de despesas. */
export function emissorDoRecibo(org: Pick<OrgInfo, 'street' | 'district' | 'city' | 'state' | 'zip' | 'phone'>): EmissorRecibo {
  return {
    nome: RECIBO_TEXTOS.cabecalho,
    cnpj: ORG_CONTACT.cnpj,
    linhasEndereco: orgAddressLines(org),
    telefone: org.phone,
    cidade: org.city,
  }
}

/** Monta todos os textos do recibo de um lançamento. */
export function montarRecibo(t: ReciboData, emissor: Pick<EmissorRecibo, 'cidade'>): ReciboPronto {
  const forma = (t.method ?? '').trim()
  return {
    numero: numeroDoRecibo(t),
    valor: centsToBRL(t.amountCents),
    trechos: trechosDoRecibo(t),
    formaDePagamento: forma ? `${RECIBO_TEXTOS.formaDePagamento}: ${forma}` : null,
    localEData: [emissor.cidade.trim(), dataPorExtenso(t.date)].filter(Boolean).join(', '),
  }
}

/** "recibo-<número ou data>-<nome curto>.pdf". Sem nome de quem pagou, o nome curto sai da descrição. */
export function nomeDoArquivoRecibo(t: ReciboData): string {
  const quando = numeroDoRecibo(t) ?? fileSlug((t.date ?? '').slice(0, 10))
  // O corte em 30 caracteres pode cair logo depois de um hífen.
  const curto = fileSlug(pagadorDoRecibo(t).nome ?? t.description ?? '', 30).replace(/-+$/, '')
  return `${['recibo', quando, curto].filter(Boolean).join('-')}.pdf`
}
