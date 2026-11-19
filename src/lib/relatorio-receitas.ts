import type { FinanceTransaction } from '@/hooks/useFinance'
import { documentoDoPagador } from '@/lib/recibo'
import { fornecedorDoLancamento, numeroDaLinha, porDataENumero } from '@/lib/relatorio-empenho'

// Relatório de receitas, o espelho do relatório de despesas (SR-140): as entradas
// do período, agrupadas por categoria, com Nº, data, quem pagou, CNPJ/CPF,
// descrição, forma de pagamento e valor. Tudo aqui é puro (sem React nem PDF).

export const SEM_CATEGORIA = 'Sem categoria'

/**
 * As receitas que entram no relatório: só entradas (`IN`), sem as transferências
 * entre caixas (a perna de entrada de uma transferência não é receita: contá-la
 * dobraria o total) e sem "só nota" (sem tipo).
 */
export function receitasDoRelatorio(transacoes: readonly FinanceTransaction[]): FinanceTransaction[] {
  return transacoes.filter(t => t.type === 'IN' && !t.transferId)
}

export type LinhaReceita = {
  id: string
  /** O `number` do lançamento, ou "—". */
  numero: string
  date: string
  /** Quem pagou, da Nota de Empenho (a mesma regra do recibo); vazio sem nome. */
  nome: string
  /** CNPJ/CPF formatado como no recibo; vazio sem documento. */
  documento: string
  descricao: string
  /** Forma de pagamento; vazio sem forma. */
  forma: string
  amountCents: number
}

export type BlocoReceita = {
  /** O id da categoria, ou `sem-categoria`. */
  chave: string
  /** O nome da categoria, ou "Sem categoria". */
  label: string
  linhas: LinhaReceita[]
  /** Subtotal da categoria, em centavos inteiros. */
  totalCents: number
}

function paraLinha(t: FinanceTransaction): LinhaReceita {
  return {
    id: t.id,
    numero: numeroDaLinha(t),
    date: t.date,
    nome: fornecedorDoLancamento(t) ?? '',
    documento: documentoDoPagador(t.empenho?.cnpjCpf)?.valor ?? '',
    descricao: t.description,
    forma: t.method?.trim() ?? '',
    amountCents: t.amountCents,
  }
}

/**
 * Um bloco por categoria que tem entrada, na ordem do nome da categoria ("Sem
 * categoria" por último). Categoria sem entrada no período não aparece. Dentro de
 * cada bloco: por data e, no mesmo dia, pelo Nº do lançamento.
 */
export function blocosDeReceitas(transacoes: readonly FinanceTransaction[]): BlocoReceita[] {
  const grupos = new Map<string, { label: string; itens: FinanceTransaction[] }>()
  for (const t of receitasDoRelatorio(transacoes)) {
    const nome = t.category?.name?.trim()
    const chave = t.category && nome ? t.category.id : 'sem-categoria'
    const grupo = grupos.get(chave) ?? { label: nome && t.category ? nome : SEM_CATEGORIA, itens: [] }
    grupo.itens.push(t)
    grupos.set(chave, grupo)
  }

  return [...grupos.entries()]
    .sort(([ca, a], [cb, b]) => {
      if (ca === 'sem-categoria' || cb === 'sem-categoria') {
        return ca === cb ? 0 : ca === 'sem-categoria' ? 1 : -1
      }
      return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
    })
    .map(([chave, { label, itens }]) => {
      const linhas = [...itens].sort(porDataENumero).map(paraLinha)
      return {
        chave,
        label,
        linhas,
        totalCents: linhas.reduce((soma, l) => soma + l.amountCents, 0),
      }
    })
}

/** O total geral: a soma dos subtotais. */
export function totalDeReceitas(blocos: readonly BlocoReceita[]): number {
  return blocos.reduce((soma, b) => soma + b.totalCents, 0)
}

/** `receitas-AAAA-MM-DD-a-AAAA-MM-DD.pdf`, no padrão do `despesas-…` do relatório de despesas. */
export function nomeDoArquivoReceitas(from: string, to: string): string {
  return `receitas-${from}-a-${to}.pdf`
}
