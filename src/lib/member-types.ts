// Tipo de membro: lista fixa. O valor gravado é o de sempre dos cadastros
// (maiúsculo, sem acento); o rótulo é o que aparece na tela.
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

/**
 * Opções do select. Cadastro antigo com um tipo fora da lista (ex.: "SOCIO")
 * continua mostrando o valor dele, marcado como antigo, até alguém trocar.
 */
export function memberTypeOptions(current: string | null | undefined): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = MEMBER_TYPES.map(t => ({ value: t.value, label: t.label }))
  if (current && !MEMBER_TYPES.some(t => t.value === current)) {
    options.push({ value: current, label: `${current} (valor antigo)` })
  }
  return options
}
