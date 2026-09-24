import type { FinanceTransaction } from '@/hooks/useFinance'
import { upperNoAccents } from '@/utils/text-format'

// Relatório de despesas por empenho, no formato que o sindicato já usa no
// sistema antigo (relatorio_empenho.php): as saídas do período separadas em
// Pessoa física, Pessoa jurídica, Tributos e Despesas bancárias, com o nº do
// empenho, a data, o nome, o valor e a situação.

export type GrupoEmpenho = 'fisica' | 'juridica' | 'tributos' | 'bancarias'

export const GRUPO_LABEL: Record<GrupoEmpenho, string> = {
  fisica: 'PESSOA FÍSICA',
  juridica: 'PESSOA JURÍDICA',
  tributos: 'TRIBUTOS',
  bancarias: 'DESPESAS BANCÁRIAS',
}

/** Ordem em que os blocos saem no papel (a mesma do relatório antigo). */
export const GRUPOS: GrupoEmpenho[] = ['fisica', 'juridica', 'tributos', 'bancarias']

const TERMOS_TRIBUTO = ['IMPOSTO', 'TRIBUTO', 'TAXA', 'INSS', 'FGTS', 'GUIA']
const TERMOS_BANCO = ['BANC', 'TARIFA']

/** Só dígitos, para saber se o documento é CPF (11) ou CNPJ (14). */
function digitos(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '')
}

/**
 * Em que bloco a despesa entra. A ordem das regras importa: um imposto pago a
 * uma pessoa jurídica é TRIBUTO, não pessoa jurídica — é assim que o relatório
 * antigo separa FGTS e INSS do resto.
 */
export function grupoDoLancamento(t: FinanceTransaction): GrupoEmpenho {
  const categoria = upperNoAccents(t.category?.name ?? '')
  if (TERMOS_TRIBUTO.some(termo => categoria.includes(termo))) return 'tributos'
  if (TERMOS_BANCO.some(termo => categoria.includes(termo))) return 'bancarias'

  // Empresa vinculada na nota, ou um documento de 14 dígitos, é pessoa jurídica.
  if (t.empenho?.empresaId) return 'juridica'
  return digitos(t.empenho?.cnpjCpf).length === 14 ? 'juridica' : 'fisica'
}

/** O nome que aparece na linha: o do fornecedor da nota, senão a descrição. */
export function nomeDoLancamento(t: FinanceTransaction): string {
  const daNota = t.empenho?.razaoSocial?.trim() || t.empenho?.nomeFantasia?.trim()
  return daNota || t.description
}

/**
 * A última coluna. O sistema não controla pago/não pago: sem forma de
 * pagamento informada, a despesa está "EM ABERTO" — que é justamente o que o
 * relatório antigo escreve. Com forma informada, mostra ela ("PIX", "DÉBITO
 * AUTOMÁTICO").
 */
export function situacaoDoLancamento(t: FinanceTransaction): string {
  const forma = t.method?.trim()
  return forma ? forma.toUpperCase() : 'EM ABERTO'
}

/**
 * As despesas que entram no relatório: saídas e "só nota" do período, sem as
 * transferências entre caixas — elas só movem dinheiro de um caixa para outro
 * e contá-las dobraria o total.
 */
export function despesasDoRelatorio(transacoes: readonly FinanceTransaction[]): FinanceTransaction[] {
  return transacoes.filter(t => !t.transferId && (t.type === 'OUT' || t.type === null))
}

export type LinhaEmpenho = {
  id: string
  numero: string
  date: string
  nome: string
  amountCents: number
  situacao: string
}

export type BlocoEmpenho = {
  grupo: GrupoEmpenho
  label: string
  linhas: LinhaEmpenho[]
  totalCents: number
}

function paraLinha(t: FinanceTransaction): LinhaEmpenho {
  return {
    id: t.id,
    numero: t.empenho?.numero?.trim() || '—',
    date: t.date,
    nome: nomeDoLancamento(t),
    amountCents: t.amountCents,
    situacao: situacaoDoLancamento(t),
  }
}

/**
 * Monta os quatro blocos. Bloco vazio continua aparecendo, com total zero: no
 * relatório antigo "DESPESAS BANCÁRIAS R$ 0,00" é informação, não sobra.
 */
export function blocosDoRelatorio(transacoes: readonly FinanceTransaction[]): BlocoEmpenho[] {
  const despesas = despesasDoRelatorio(transacoes)

  return GRUPOS.map(grupo => {
    const linhas = despesas
      .filter(t => grupoDoLancamento(t) === grupo)
      .map(paraLinha)
      // Por data e, no mesmo dia, pelo nº do empenho — a ordem em que foram emitidos.
      .sort((a, b) => a.date.localeCompare(b.date) || a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true }))

    return {
      grupo,
      label: GRUPO_LABEL[grupo],
      linhas,
      totalCents: linhas.reduce((soma, l) => soma + l.amountCents, 0),
    }
  })
}

/** O total geral do cabeçalho: a soma dos quatro blocos. */
export function totalDoRelatorio(blocos: readonly BlocoEmpenho[]): number {
  return blocos.reduce((soma, b) => soma + b.totalCents, 0)
}
