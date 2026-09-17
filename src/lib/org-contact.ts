/**
 * Valores padrão dos dados do sindicato. Os valores de verdade ficam em
 * Configurações do site › Dados do sindicato (ver `useOrgInfo`); estes só
 * aparecem enquanto as configurações carregam (ou se a API falhar). Campo
 * salvo vazio não aparece no site.
 */
export const ORG_CONTACT = {
  phone: '(44) 3645-2199',
  email: 'contato@sindicatoruraltr.com.br',
  street: 'Rua José Tondato, 80',
  district: 'Centro',
  city: 'Terra Roxa',
  state: 'PR',
  zip: '85990-000',
  hours: 'Segunda a Sexta: 08h às 17h\nSábado: 08h às 12h',
  mapQuery: 'Sindicato Rural de Terra Roxa PR Brasil',
} as const

/** "(44) 3645-2199" → "4436452199" para href tel:. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

type OrgAddress = { street: string; district: string; city: string; state: string; zip: string }

/**
 * Endereço em até duas linhas ("Rua, Bairro" / "Cidade – UF, CEP"), pulando o
 * que estiver vazio para não sobrar ", " ou " – " soltos.
 */
export function orgAddressLines(a: OrgAddress): string[] {
  const line1 = [a.street, a.district].filter(Boolean).join(', ')
  const line2 = [[a.city, a.state].filter(Boolean).join(' – '), a.zip].filter(Boolean).join(', ')
  return [line1, line2].filter(Boolean)
}
