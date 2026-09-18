import { describe, it, expect } from 'vitest'
import { maskCNS, unmaskDigits } from '@/utils/masks'
import {
  UNIMED_MOVEMENT_TYPES, UNIMED_DEPENDENCY_DEGREES, unimedOptionsWith, unimedOptionLabel,
} from '@/lib/unimed-options'

describe('máscara do CNS', () => {
  it('formata em 3-4-4-4 e ignora o que não é dígito', () => {
    expect(maskCNS('702306148448619')).toBe('702 3061 4844 8619')
    expect(maskCNS('702.306/1484-486a19')).toBe('702 3061 4844 8619')
  })

  it('formata enquanto digita e corta no 15º dígito', () => {
    expect(maskCNS('7')).toBe('7')
    expect(maskCNS('7023')).toBe('702 3')
    expect(maskCNS('70230614')).toBe('702 3061 4')
    expect(maskCNS('70230614844861999')).toBe('702 3061 4844 8619')
    expect(maskCNS('')).toBe('')
  })

  it('volta para só dígitos na hora de gravar', () => {
    expect(unmaskDigits(maskCNS('702306148448619'))).toBe('702306148448619')
    expect(unmaskDigits(null)).toBe('')
  })
})

describe('listas fixas da Unimed', () => {
  it('tem os tipos de movimento e graus de dependência esperados', () => {
    expect(UNIMED_MOVEMENT_TYPES.map(o => o.value)).toEqual([
      'INCLUSAO DE TITULAR', 'INCLUSAO DE DEPENDENTE', 'EXCLUSAO DE TITULAR',
      'EXCLUSAO DE DEPENDENTE', 'ALTERACAO CADASTRAL', 'REATIVACAO',
    ])
    expect(UNIMED_DEPENDENCY_DEGREES.map(o => o.value)).toEqual([
      'TITULAR', 'CONJUGE', 'FILHO(A)', 'ENTEADO(A)', 'PAI/MAE', 'OUTRO',
    ])
  })

  it('mostra o rótulo com acento e devolve o valor cru quando é de fora da lista', () => {
    expect(unimedOptionLabel(UNIMED_DEPENDENCY_DEGREES, 'CONJUGE')).toBe('Cônjuge')
    expect(unimedOptionLabel(UNIMED_MOVEMENT_TYPES, 'INCLUSAO TITULAR')).toBe('INCLUSAO TITULAR')
    expect(unimedOptionLabel(UNIMED_MOVEMENT_TYPES, null)).toBe('')
  })

  it('acrescenta o valor antigo do cadastro como opção, sem duplicar os da lista', () => {
    const comAntigo = unimedOptionsWith(UNIMED_MOVEMENT_TYPES, 'INCLUSAO TITULAR')
    expect(comAntigo).toHaveLength(UNIMED_MOVEMENT_TYPES.length + 1)
    expect(comAntigo.at(-1)).toEqual({ value: 'INCLUSAO TITULAR', label: 'INCLUSAO TITULAR (valor antigo)' })

    expect(unimedOptionsWith(UNIMED_MOVEMENT_TYPES, 'REATIVACAO')).toHaveLength(UNIMED_MOVEMENT_TYPES.length)
    expect(unimedOptionsWith(UNIMED_MOVEMENT_TYPES, '')).toHaveLength(UNIMED_MOVEMENT_TYPES.length)
  })
})
