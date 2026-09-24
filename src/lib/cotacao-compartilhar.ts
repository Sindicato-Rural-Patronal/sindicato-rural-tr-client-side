import type { MarketQuote } from '@/hooks/useMarketQuotes'
import { quoteProductLabel } from '@/lib/quote-utils'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'

// Cotação para mandar em grupo de WhatsApp. Duas formas, porque em grupo as
// duas são usadas: o TEXTO, que a pessoa cola direto na conversa e todo mundo
// lê sem abrir nada, e o LINK da página enxuta, para quem quiser conferir
// depois. O texto ganha da imagem aqui: ele é pesquisável na conversa e não
// depende de carregar nada.

/** "24/09/2026" a partir de "2026-09-24T00:00:00.000Z" ou "2026-09-24". */
export function diaDaCotacao(quotes: readonly MarketQuote[]): string | null {
  const dia = quotes.map(q => q.referenceDate).filter(Boolean).sort().at(-1)
  return dia ? formatDateFromString(dia.slice(0, 10)) : null
}

/**
 * "R$ 120,00" com espaço NORMAL. O `centsToBRL` põe um espaço não separável
 * (U+00A0) entre o "R$" e o número, que é o certo na tela mas atrapalha num
 * texto que vai para WhatsApp e SMS — e deixaria o texto copiado diferente da
 * prévia do link, que o servidor monta com espaço comum.
 */
function preco(cents: number | null): string | null {
  return cents == null ? null : centsToBRL(cents).replace(/\u00a0/g, ' ')
}

/** A linha de um produto: "Soja (sc 60kg): manhã R$ 120,00 · tarde R$ 140,00". */
export function linhaDoProduto(q: MarketQuote): string {
  const nome = quoteProductLabel(q.label)
  const unidade = q.unit ? ` (${q.unit})` : ''

  const manha = preco(q.morningCents)
  const tarde = preco(q.afternoonCents)
  const periodos = [
    manha && `manhã ${manha}`,
    tarde && `tarde ${tarde}`,
  ].filter(Boolean)

  // Lançamento antigo, sem os dois períodos guardados: cai no preço atual.
  const valores = periodos.length > 0
    ? periodos.join(' · ')
    : (preco(q.priceCents) ?? q.value ?? '—')

  return `${nome}${unidade}: ${valores}`
}

/**
 * O texto pronto para colar no grupo. Sem asteriscos nem emoji: o WhatsApp
 * formata `*assim*`, mas o mesmo texto vai parar em SMS, e-mail e bloco de
 * notas, onde os asteriscos aparecem crus.
 */
export function textoDaCotacao(
  quotes: readonly MarketQuote[],
  opcoes: { fonte?: string | null; link?: string | null } = {},
): string {
  const dia = diaDaCotacao(quotes)
  const linhas = [
    dia ? `Cotações do dia ${dia}` : 'Cotações',
    'Sindicato Rural de Terra Roxa',
    '',
    ...quotes.map(linhaDoProduto),
  ]

  const fonte = opcoes.fonte?.trim()
  if (fonte) linhas.push('', `Fonte: ${fonte}`)
  if (opcoes.link) linhas.push('', opcoes.link)

  return linhas.join('\n')
}

/** Link do WhatsApp com o texto já escrito (abre a escolha da conversa). */
export function whatsappDaCotacao(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}

/**
 * A descrição que o WhatsApp mostra na prévia do link. Uma linha só, curta,
 * porque a prévia corta: produto e preço, separados por " · ".
 */
export function resumoDaCotacao(quotes: readonly MarketQuote[]): string {
  return quotes
    .map(q => {
      const atual = preco(q.afternoonCents ?? q.morningCents ?? q.priceCents)
      return atual ? `${quoteProductLabel(q.label)} ${atual}` : null
    })
    .filter(Boolean)
    .join(' · ')
}
