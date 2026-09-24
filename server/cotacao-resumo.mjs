// Resumo das cotações para a prévia do link no WhatsApp. Mesma ideia do
// `resumoDaCotacao` do app (src/lib/cotacao-compartilhar.ts), reescrita aqui
// porque o servidor não carrega o bundle do React.

const NOME = {
  SOJA: 'Soja',
  MILHO: 'Milho',
  TRIGO: 'Trigo',
  MANDIOCA: 'Mandioca',
  DOLAR: 'Dólar',
}

function reais(cents) {
  if (cents == null) return null
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

/** "24/09/2026" a partir de "2026-09-24T00:00:00.000Z". */
export function diaDaCotacao(quotes) {
  const dia = quotes
    .map(q => q.referenceDate)
    .filter(Boolean)
    .sort()
    .at(-1)
  if (!dia) return null
  const [ano, mes, d] = String(dia).slice(0, 10).split('-')
  return `${d}/${mes}/${ano}`
}

/** "Soja R$ 140,00 · Milho R$ 58,00 · …" — uma linha, que é o que a prévia mostra. */
export function resumoDaCotacao(quotes) {
  return quotes
    .map(q => {
      const valor = reais(q.afternoonCents ?? q.morningCents ?? q.priceCents)
      return valor ? `${NOME[q.label] ?? q.label} ${valor}` : null
    })
    .filter(Boolean)
    .join(' · ')
}
