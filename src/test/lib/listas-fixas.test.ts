import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { MEMBER_STATUS, MEMBER_TYPES } from '@/lib/member-types'
import { ROOM_NAMES } from '@/lib/room-names'
import { UNIMED_DEPENDENCY_DEGREES, UNIMED_MOVEMENT_TYPES } from '@/lib/unimed-options'

// Listas fixas que existem DUAS VEZES: aqui (rótulo + opções do select) e no
// backend (que recusa valor fora delas). Nada liga uma à outra — se divergirem,
// o sintoma na tela é um 400 ou 409 sem explicação nenhuma.
//
// O teste tem duas camadas:
//
// 1. Os valores esperados escritos aqui. Mexer na lista sem mexer no teste
//    quebra a suíte — a divergência passa a ser um ato deliberado, não um
//    esquecimento.
// 2. Quando o repositório do backend está do lado (o caso de quem trabalha nos
//    dois), o teste LÊ o arquivo de lá e compara de verdade. Se não estiver, a
//    camada 1 continua valendo e o teste diz que comparou só ela.

const ESPERADO = {
  ROOM_NAMES: ['AUDITORIO', 'COZINHA', 'SALA DE VIDEO CONFERENCIA', 'SALA 1', 'SALA 2', 'SALA APL'],
  MEMBER_TYPES: [
    'ALUNO', 'PRODUTOR RURAL', 'TRABALHADOR RURAL ASSALARIADO', 'TRABALHADOR RURAL AUTONOMO',
  ],
  MEMBER_STATUS: ['ACTIVE', 'INACTIVE'],
  UNIMED_MOVEMENT_TYPES: [
    'INCLUSAO DE TITULAR', 'INCLUSAO DE DEPENDENTE', 'EXCLUSAO DE TITULAR',
    'EXCLUSAO DE DEPENDENTE', 'ALTERACAO CADASTRAL', 'REATIVACAO',
  ],
  UNIMED_DEPENDENCY_DEGREES: ['TITULAR', 'CONJUGE', 'FILHO(A)', 'ENTEADO(A)', 'PAI/MAE', 'OUTRO'],
}

/** Onde a lista mora no backend. Caminho relativo à raiz DAQUELE repositório. */
const NO_BACKEND: Record<string, { arquivo: string; constante: string } | null> = {
  ROOM_NAMES: { arquivo: 'src/lib/room-names.ts', constante: 'ROOM_NAMES' },
  MEMBER_TYPES: { arquivo: 'src/lib/member-types.ts', constante: 'MEMBER_TYPES' },
  UNIMED_MOVEMENT_TYPES: { arquivo: 'src/lib/unimed-options.ts', constante: 'UNIMED_MOVEMENT_TYPES' },
  UNIMED_DEPENDENCY_DEGREES: { arquivo: 'src/lib/unimed-options.ts', constante: 'UNIMED_DEPENDENCY_DEGREES' },
  // Situação do associado é o enum MemberStatus do Prisma, não uma lista solta.
  MEMBER_STATUS: null,
}

// O vitest roda com a raiz do repositório como diretório de trabalho; o
// backend fica ao lado. `resolve` cuida da diferença de barra entre sistemas.
const BACKEND = resolve(process.cwd(), '..', 'back-sidicato-rural-tr')
const temBackend = existsSync(join(BACKEND, 'prisma', 'schema.prisma'))

/** Os textos entre aspas simples de `export const NOME = [ ... ]`. */
function listaDoBackend(arquivo: string, constante: string): string[] {
  const code = readFileSync(join(BACKEND, arquivo), 'utf8')
  const inicio = code.indexOf(`export const ${constante} = [`)
  if (inicio < 0) throw new Error(`${constante} nao encontrada em ${arquivo}`)
  const fim = code.indexOf(']', inicio)
  return [...code.slice(inicio, fim).matchAll(/'([^']+)'/g)].map(m => m[1])
}

const valores: Record<string, string[]> = {
  ROOM_NAMES: [...ROOM_NAMES],
  MEMBER_TYPES: MEMBER_TYPES.map(t => t.value),
  MEMBER_STATUS: MEMBER_STATUS.map(s => s.value),
  UNIMED_MOVEMENT_TYPES: UNIMED_MOVEMENT_TYPES.map(o => o.value),
  UNIMED_DEPENDENCY_DEGREES: UNIMED_DEPENDENCY_DEGREES.map(o => o.value),
}

describe('listas fixas compartilhadas com o backend', () => {
  it.each(Object.keys(ESPERADO))('%s bate com os valores esperados', nome => {
    expect(valores[nome]).toEqual(ESPERADO[nome as keyof typeof ESPERADO])
  })

  it.each(Object.entries(NO_BACKEND).filter(([, alvo]) => alvo) as [string, { arquivo: string; constante: string }][])(
    '%s bate com a lista do backend',
    (nome, alvo) => {
      if (!temBackend) {
        // Sem o repositório do lado não dá para comparar de verdade; os valores
        // esperados acima já foram conferidos pelo teste anterior.
        expect(valores[nome].length).toBeGreaterThan(0)
        return
      }
      expect(listaDoBackend(alvo.arquivo, alvo.constante), `${alvo.arquivo} → ${alvo.constante}`).toEqual(valores[nome])
    },
  )

  it('todo rótulo de select existe e não está vazio', () => {
    for (const lista of [MEMBER_TYPES, MEMBER_STATUS, UNIMED_MOVEMENT_TYPES, UNIMED_DEPENDENCY_DEGREES]) {
      for (const opcao of lista) expect(opcao.label.trim(), opcao.value).not.toBe('')
    }
  })
})
