const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata um valor em reais (número) como "R$ 1.234,56". */
export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0)
}
