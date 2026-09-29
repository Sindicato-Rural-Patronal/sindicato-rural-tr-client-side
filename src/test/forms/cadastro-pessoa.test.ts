import { describe, it, expect } from 'vitest'
import { PERSON_FIELD_NAMES } from '@/lib/person-fields'

// O cadastro de pessoa vive em DUAS telas — "Novo associado"
// (usuarios/novo.tsx) e a ficha (usuarios/$id.tsx). Elas eram dois blocos de
// JSX escritos à mão com os mesmos trinta campos repetidos, e foi assim que a
// **Situação do associado** ficou só no cadastro novo: dava para marcar alguém
// como ATIVO ao criar e nunca mais mudar.
//
// Hoje o campo é definido uma vez (`components/cadastro/person-form-fields.tsx`)
// e cada tela só diz quais entram e em que cartão. Este teste guarda essa
// última parte: campo que existe numa tela e não na outra continua sendo um
// jeito de o problema voltar.

const fontes = import.meta.glob<string>(
  '/src/routes/_admin/admin/usuarios/*.tsx',
  { query: '?raw', import: 'default', eager: true },
)

const arquivo = (fim: string) =>
  Object.entries(fontes).find(([nome]) => nome.endsWith(fim))?.[1] ?? ''

const novo = arquivo('usuarios/novo.tsx')
const ficha = arquivo('usuarios/$id.tsx')

const telas = [['cadastro novo', novo], ['ficha', ficha]] as const

/**
 * Campos que descrevem o vínculo da pessoa com o sindicato. É o grupo que
 * divergiu de verdade, e o que mais dói quando falta: a aba "Associados"
 * filtra por situação ativa.
 */
const CAMPOS_DO_ASSOCIADO = [
  'memberType',
  'memberStatus',
  'memberClassification',
  'memberSince',
  'membershipValidUntil',
  'boardMember',
  'boardPosition',
  'memberNotes',
  'memberNotesNumber',
]

describe('as duas telas do cadastro de pessoa', () => {
  it('encontra os dois arquivos', () => {
    expect(novo.length).toBeGreaterThan(1000)
    expect(ficha.length).toBeGreaterThan(1000)
  })

  it.each(CAMPOS_DO_ASSOCIADO)('"%s" está nas duas telas', campo => {
    for (const [nome, code] of telas) {
      expect(code, `${campo} não está no ${nome}`).toContain(`campo="${campo}"`)
    }
  })

  it('nenhuma das duas escreve rótulo ou opção de campo de pessoa à mão', () => {
    for (const [nome, code] of telas) {
      // A lista de situação vivia solta no meio do JSX de uma das telas.
      expect(code, `${nome} escreveu 'ACTIVE' à mão`).not.toMatch(/value: 'ACTIVE'/)
      expect(code, `${nome} escreveu o rótulo da situação à mão`).not.toContain('label="Situação"')
    }
  })

  it('juntas, as telas usam todos os campos definidos', () => {
    // Campo definido no módulo e esquecido nas duas telas é trabalho perdido;
    // e a lista do módulo é o que o PersonField.test.tsx cobre um por um.
    const usados = new Set(
      [...(novo + ficha).matchAll(/campo="(\w+)"/g)].map(m => m[1]),
    )
    const esquecidos = PERSON_FIELD_NAMES.filter(c => !usados.has(c))
    expect(esquecidos, 'campos definidos e nunca mostrados').toEqual([])
  })
})
