/**
 * Só o CNPJ fica aqui: os dados de contato (telefone, e-mail, endereço,
 * horário) vêm das Configurações do site › Dados do sindicato (`useOrgInfo`).
 * Não há valor reserva para eles: contato inventado é pior que contato ausente,
 * então enquanto as configurações carregam, ou se a API falhar, o site não
 * mostra o campo. Campo salvo vazio também não aparece.
 */
export const ORG_CONTACT = {
  /**
   * CNPJ do sindicato. Não há campo para ele em Configurações (nada no site
   * público mostra CNPJ), mas o relatório de despesas e o recibo precisam dele
   * no cabeçalho, como no modelo do sistema antigo.
   */
  cnpj: '77.419.505/0001-10',
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
