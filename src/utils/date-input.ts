// Campo de data digitável (dd/mm/aaaa) do DatePicker. Valor do formulário
// continua "YYYY-MM-DD" (ou "" vazio).

/** Digitação → "dd/mm/aaaa" com as barras no lugar. Colar "1952-05-12" também funciona. */
export function maskDateBr(input: string): string {
  const iso = input.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  const digits = input.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * "dd/mm/aaaa" completo e válido → "YYYY-MM-DD"; `null` se incompleto, se o dia
 * não existe (31/02) ou se o ano está fora de [fromYear, toYear].
 */
export function parseDateBr(
  text: string,
  { fromYear, toYear }: { fromYear?: number; toYear?: number } = {},
): string | null {
  const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12 || day < 1) return null
  if (fromYear !== undefined && year < fromYear) return null
  if (toYear !== undefined && year > toYear) return null
  // Dia que não existe no mês "vira" o mês seguinte no Date: confere de volta.
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

/** "YYYY-MM-DD" (ou ISO completo) → "dd/mm/aaaa"; vazio/inválido → "". */
export function ymdToBr(value: string | null | undefined): string {
  const m = (value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
