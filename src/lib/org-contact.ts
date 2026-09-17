/**
 * Valores padrão dos dados do sindicato. Os valores de verdade ficam em
 * Configurações do site › Dados do sindicato (ver `useOrgInfo`); estes só
 * aparecem enquanto carrega ou se um campo estiver vazio.
 */
export const ORG_CONTACT = {
  phone: '(44) 3645-1200',
  email: 'contato@sindicatoruraltr.com.br',
  street: 'Rua Sete de Setembro, 1847',
  district: 'Centro',
  city: 'Terra Roxa',
  state: 'PR',
  zip: '85990-000',
  hours: 'Segunda a Sexta: 08h às 17h\nSábado: 08h às 12h',
  mapQuery: 'Sindicato Rural de Terra Roxa PR Brasil',
} as const

/** "(44) 3645-1200" → "4436451200" para href tel:. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}
