// Tipo de membro: lista fixa. O valor gravado é o de sempre dos cadastros
// (maiúsculo, sem acento); o rótulo é o que aparece na tela. Também são as opções
// do select — tipos antigos (ex.: "SOCIO") foram para as observações na migration.
export const MEMBER_TYPES = [
  { value: 'ALUNO', label: 'Aluno' },
  { value: 'PRODUTOR RURAL', label: 'Produtor rural' },
  { value: 'TRABALHADOR RURAL ASSALARIADO', label: 'Trabalhador rural assalariado' },
  { value: 'TRABALHADOR RURAL AUTONOMO', label: 'Trabalhador rural autônomo' },
] as const

export function memberTypeLabel(value: string | null | undefined): string {
  if (!value) return ''
  return MEMBER_TYPES.find(t => t.value === value)?.label ?? value
}

// Situação do associado. Manda no selo "Associado" das inscrições, na aba
// Associados da lista (que filtra por ATIVO) e no aviso de associação vencendo.
// Ficava escrita à mão só no cadastro novo, e por isso faltava na ficha.
export const MEMBER_STATUS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
] as const
