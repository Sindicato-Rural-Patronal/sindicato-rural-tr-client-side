/**
 * Dados de contato oficiais do sindicato — fonte única usada pelo footer e pela
 * página de Contato (antes divergiam). Atualize aqui e reflete em toda a app.
 */
export const ORG_CONTACT = {
  phone: '(44) 3645-1200',
  email: 'contato@sindicatoruraltr.com.br',
  street: 'Rua Sete de Setembro, 1847',
  district: 'Centro',
  city: 'Terra Roxa',
  state: 'PR',
  zip: '85990-000',
} as const

/** "(44) 3645-1200" → "4436451200" para href tel:. */
export const orgPhoneDigits = ORG_CONTACT.phone.replace(/\D/g, '')
