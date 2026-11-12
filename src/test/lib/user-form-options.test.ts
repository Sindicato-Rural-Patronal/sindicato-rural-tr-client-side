import { describe, it, expect } from 'vitest'
import { EDUCATION_OPTIONS, ETHNICITY_OPTIONS } from '@/lib/user-form-options'

// Os rótulos do cadastro são também os do filtro de Pessoas e do "Filtros:" do
// montador, e precisam bater com os que a API escreve no PDF e na Auditoria
// (back: src/lib/export-labels.ts). A cópia abaixo é de propósito.
const rotulos = (lista: { value: string; label: string }[]) =>
  Object.fromEntries(lista.map(o => [o.value, o.label]))

describe('opções do cadastro de pessoa', () => {
  it('escolaridade por extenso, como a API escreve', () => {
    expect(rotulos(EDUCATION_OPTIONS)).toEqual({
      NO_FORMAL_EDUCATION: 'Sem escolaridade',
      INCOMPLETE_PRIMARY: 'Fundamental incompleto',
      COMPLETE_PRIMARY: 'Fundamental completo',
      INCOMPLETE_SECONDARY: 'Médio incompleto',
      COMPLETE_SECONDARY: 'Médio completo',
      INCOMPLETE_HIGHER: 'Superior incompleto',
      COMPLETE_HIGHER: 'Superior completo',
      POSTGRADUATE: 'Pós-graduação',
    })
  })

  it('etnia no feminino ("cor ou raça"), como a API escreve', () => {
    expect(rotulos(ETHNICITY_OPTIONS)).toEqual({
      WHITE: 'Branca',
      BLACK: 'Preta',
      MIXED: 'Parda',
      ASIAN: 'Amarela',
      INDIGENOUS: 'Indígena',
    })
  })
})
