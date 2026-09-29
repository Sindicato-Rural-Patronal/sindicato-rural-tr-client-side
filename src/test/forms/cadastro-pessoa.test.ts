import { describe, it, expect } from 'vitest'
import { MEMBER_STATUS, MEMBER_TYPES } from '@/lib/member-types'

// O cadastro de pessoa vive em DOIS formulários quase iguais — "Novo associado"
// (usuarios/novo.tsx) e a ficha (usuarios/$id.tsx) —, cada um com seus campos
// escritos à mão. Foi assim que a **Situação do associado** ficou só no
// cadastro novo: dava para marcar alguém como ATIVO ao criar e nunca mais
// mudar, e quem se inscrevia pelo site nascia sem situação nenhuma e não
// aparecia na aba Associados, sem saída pelo painel.
//
// Enquanto os dois formulários forem separados, este teste é o que segura a
// divergência: todo campo do associado precisa estar nos dois.

const fontes = import.meta.glob<string>(
  '/src/routes/_admin/admin/usuarios/*.tsx',
  { query: '?raw', import: 'default', eager: true },
)

const arquivo = (fim: string) =>
  Object.entries(fontes).find(([nome]) => nome.endsWith(fim))?.[1] ?? ''

const novo = arquivo('usuarios/novo.tsx')
const ficha = arquivo('usuarios/$id.tsx')

/** Campos que descrevem o vínculo da pessoa com o sindicato. */
const CAMPOS_DO_ASSOCIADO = [
  'memberType',
  'memberStatus',
  'memberClassification',
  'memberSince',
  'membershipValidUntil',
  'boardMember',
  'boardPosition',
]

describe('os dois formulários de pessoa', () => {
  it('encontra os dois arquivos', () => {
    expect(novo.length).toBeGreaterThan(1000)
    expect(ficha.length).toBeGreaterThan(1000)
  })

  it.each(CAMPOS_DO_ASSOCIADO)('"%s" pode ser informado no cadastro E alterado na ficha', campo => {
    // `set('campo'` é como os dois formulários escrevem no estado.
    expect(novo, `${campo} não está no cadastro novo`).toContain(`set('${campo}'`)
    expect(ficha, `${campo} não está na ficha da pessoa`).toContain(`set('${campo}'`)
  })

  it('os dois usam a MESMA lista de situação, não uma escrita à mão', () => {
    // Uma lista solta no meio do JSX é como a divergência começa.
    for (const [nome, code] of [['novo', novo], ['ficha', ficha]] as const) {
      expect(code, `${nome} escreveu as opções à mão`).toContain('MEMBER_STATUS')
      expect(code, `${nome} escreveu 'ACTIVE' à mão`).not.toMatch(/value: 'ACTIVE'/)
    }
  })
})

describe('listas fixas do associado', () => {
  it('a situação é a que o backend aceita (enum MemberStatus)', () => {
    expect(MEMBER_STATUS.map(s => s.value)).toEqual(['ACTIVE', 'INACTIVE'])
  })

  it('todo tipo de membro tem rótulo em português', () => {
    for (const t of MEMBER_TYPES) expect(t.label, t.value).not.toBe('')
  })
})
