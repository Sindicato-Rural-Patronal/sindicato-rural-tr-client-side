export function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{5})(\d{1,3})$/, '$1-$2')
}

export function maskMoney(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 12)
  if (!digits) return ''
  const n = parseInt(digits, 10) / 100
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Valor mascarado ("R$ 1.234,56") → centavos inteiros (123456). Sem float.
export function moneyToCents(masked: string): number {
  const digits = masked.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

// Centavos inteiros → texto BRL ("R$ 1.234,56").
export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function maskCNH(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
}

export function maskRG(v: string) {
  const raw = v.replace(/[^0-9Xx]/g, '').slice(0, 9).toUpperCase()
  if (raw.length <= 2) return raw
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`
}

/**
 * CNS (Cartão Nacional de Saúde): 15 dígitos, exibidos em "000 0000 0000 0000".
 * É gravado só com os dígitos — use `unmaskDigits` antes de enviar.
 */
export function maskCNS(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 15)
  return [d.slice(0, 3), d.slice(3, 7), d.slice(7, 11), d.slice(11, 15)].filter(Boolean).join(' ')
}

/** Só os dígitos de um valor mascarado (CNS, CPF, telefone…). */
export function unmaskDigits(v: string | null | undefined) {
  return (v ?? '').replace(/\D/g, '')
}

/** "11222333000181" → "11.222.333/0001-81" (formata enquanto digita). */
export function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}
