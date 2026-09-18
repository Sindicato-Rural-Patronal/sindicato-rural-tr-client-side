// Unimed: listas fixas do formulário (o campo era texto livre e virou select).
// O valor gravado é maiúsculo e sem acento — o mesmo texto que o sistema legado
// imprimia na Ficha de Movimentação; o rótulo é o que aparece na tela.
//
// Cadastros antigos podem ter texto fora da lista. Esse valor NÃO se perde:
// `unimedOptionsWith` o acrescenta como opção "(valor antigo)" e o backend aceita
// o valor que já estava gravado no próprio registro.

export type UnimedOption = { value: string; label: string }

export const UNIMED_MOVEMENT_TYPES: UnimedOption[] = [
  { value: 'INCLUSAO DE TITULAR', label: 'Inclusão de titular' },
  { value: 'INCLUSAO DE DEPENDENTE', label: 'Inclusão de dependente' },
  { value: 'EXCLUSAO DE TITULAR', label: 'Exclusão de titular' },
  { value: 'EXCLUSAO DE DEPENDENTE', label: 'Exclusão de dependente' },
  { value: 'ALTERACAO CADASTRAL', label: 'Alteração cadastral' },
  { value: 'REATIVACAO', label: 'Reativação' },
]

export const UNIMED_DEPENDENCY_DEGREES: UnimedOption[] = [
  { value: 'TITULAR', label: 'Titular' },
  { value: 'CONJUGE', label: 'Cônjuge' },
  { value: 'FILHO(A)', label: 'Filho(a)' },
  { value: 'ENTEADO(A)', label: 'Enteado(a)' },
  { value: 'PAI/MAE', label: 'Pai/Mãe' },
  { value: 'OUTRO', label: 'Outro' },
]

/** Rótulo da opção; valor fora da lista aparece como está. */
export function unimedOptionLabel(options: UnimedOption[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find(o => o.value === value)?.label ?? value
}

/**
 * Opções do select: as da lista e, quando o valor atual for de um cadastro
 * antigo (fora da lista), ele também — marcado como "(valor antigo)" para que
 * salvar o registro não apague o dado histórico.
 */
export function unimedOptionsWith(options: UnimedOption[], current: string | null | undefined): UnimedOption[] {
  const value = (current ?? '').trim()
  if (!value || options.some(o => o.value === value)) return options
  return [...options, { value, label: `${value} (valor antigo)` }]
}
