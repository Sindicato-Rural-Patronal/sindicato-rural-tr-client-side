// A lista de Lançamentos com as colunas da visão (decisão 007): o texto de cada
// célula, PURO e testado. As seis chaves de realce saem do lançamento cru (como a
// tabela de sempre); as outras, do texto que a API formatou (`cells`).
import { numeroValido } from '@/lib/finance-number'
import type { FinanceTransaction } from '@/hooks/useFinance'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'

/** "+ " na entrada, "− " na saída e nada no "só nota" (a cor fica com a tela). */
export const sinal = (t: Pick<FinanceTransaction, 'type'>) => (t.type === 'IN' ? '+ ' : t.type === 'OUT' ? '− ' : '')

/** As chaves que a tela desenha a partir do lançamento cru (com realce). */
export const CHAVES_COM_REALCE: readonly string[] = ['number', 'date', 'description', 'category', 'account', 'amount']

/** O texto que a célula mostra (para medir a coluna, para o cartão do celular e para o `title`). */
export function textoDaCelula(key: string, t: FinanceTransaction, celula: string | undefined): string {
  switch (key) {
    case 'number': return numeroValido(t.number) ? String(t.number) : '—'
    case 'date': return formatDateFromString(t.date.slice(0, 10))
    case 'description': return t.description
    case 'category': return t.category?.name ?? ''
    case 'account': return t.account?.name ?? ''
    case 'amount': return `${sinal(t)}${centsToBRL(t.amountCents)}`
    default: return celula ?? ''
  }
}

/** Na tabela o cabeçalho já diz "Valor (R$)": o valor sai sem o "R$" ("+ 1.234,56"). */
export function textoNaTabela(key: string, t: FinanceTransaction, celula: string | undefined): string {
  if (key === 'amount') return `${sinal(t)}${centsToBRL(t.amountCents).replace(/^R\$\s*/, '')}`
  return textoDaCelula(key, t, celula)
}

/**
 * O que o Exportar diz dos totais do Excel e do PDF (SR-131): só com o Valor entre
 * as colunas; com Tipo Entradas, o total de entradas; com Saídas, o de saídas.
 */
export function textoDosTotaisDosLancamentos(cols: readonly string[], tipo: string | undefined): string | null {
  if (!cols.includes('amount')) return null
  if (tipo === 'IN') return 'O Excel e o PDF trazem o total de entradas no fim.'
  if (tipo === 'OUT') return 'O Excel e o PDF trazem o total de saídas no fim.'
  return 'O Excel e o PDF trazem os totais de entradas e de saídas no fim.'
}
