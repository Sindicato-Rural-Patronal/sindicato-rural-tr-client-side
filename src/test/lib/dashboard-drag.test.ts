import { describe, it, expect } from 'vitest'
import {
  lerGrade, ordemArrastada, posicoesDaGrade, previaDoArrasto, spanMedido, type Medida,
} from '@/components/dashboard/dashboard-drag'

// Um painel de verdade medido no computador: grade de 1000px, duas colunas de
// 488 e vão de 24 (o `gap-6`). Ordem: dois blocos de linha inteira, dois de
// meia linha dividindo a linha e um de meia linha sozinho no fim.
const PAINEL: Medida[] = [
  { left: 0, top: 0, width: 1000, height: 100 },   // 0 ações      (inteira)
  { left: 0, top: 124, width: 1000, height: 140 }, // 1 números    (inteira)
  { left: 0, top: 288, width: 488, height: 200 },  // 2 cursos     (metade)
  { left: 512, top: 288, width: 488, height: 200 },// 3 incompletos(metade)
  { left: 0, top: 512, width: 488, height: 160 },  // 4 auditoria  (metade)
]

// O mesmo painel no celular: uma coluna, todo bloco na linha inteira.
const CELULAR: Medida[] = [
  { left: 0, top: 0, width: 360, height: 100 },
  { left: 0, top: 116, width: 360, height: 140 },
  { left: 0, top: 272, width: 360, height: 200 },
]

describe('lerGrade', () => {
  it('lê as duas colunas, a largura e o vão pelas medidas', () => {
    expect(lerGrade(PAINEL)).toEqual({
      colunas: 2, left: 0, top: 0, larguraColuna: 488, vao: 24,
    })
  })

  it('sem nenhum bloco de meia largura, entende que é uma coluna só', () => {
    const grade = lerGrade(CELULAR)
    expect(grade?.colunas).toBe(1)
    expect(grade?.larguraColuna).toBe(360)
    expect(grade?.vao).toBe(16)
  })

  it('sem blocos não há grade', () => {
    expect(lerGrade([])).toBeNull()
  })
})

describe('spanMedido', () => {
  it('separa linha inteira de meia linha pela largura', () => {
    const grade = lerGrade(PAINEL)!
    expect(spanMedido(PAINEL[0], grade)).toBe(2)
    expect(spanMedido(PAINEL[2], grade)).toBe(1)
  })

  it('no celular todo bloco ocupa a linha', () => {
    const grade = lerGrade(CELULAR)!
    expect(spanMedido(CELULAR[0], grade)).toBe(2)
  })
})

describe('posicoesDaGrade', () => {
  it('empacotar a ordem ATUAL devolve exatamente onde os blocos já estão', () => {
    // Esta é a prova de que a conta bate com o que o CSS faz: se a grade
    // refeita não reproduz as medidas, a prévia do arrasto sai torta.
    const grade = lerGrade(PAINEL)!
    const itens = PAINEL.map(r => ({ span: spanMedido(r, grade), height: r.height }))
    expect(posicoesDaGrade(itens, grade)).toEqual(
      PAINEL.map(r => ({ left: r.left, top: r.top })),
    )
  })

  it('bloco de linha inteira não divide linha: desce e deixa o lado vazio', () => {
    const grade = lerGrade(PAINEL)!
    const posicoes = posicoesDaGrade([
      { span: 1, height: 160 }, // meia linha, abre a linha
      { span: 2, height: 100 }, // inteira: não cabe ao lado, desce
    ], grade)
    expect(posicoes).toEqual([{ left: 0, top: 0 }, { left: 0, top: 184 }])
  })

  it('a altura da linha é a do bloco mais alto dela', () => {
    const grade = lerGrade(PAINEL)!
    const posicoes = posicoesDaGrade([
      { span: 1, height: 100 },
      { span: 1, height: 250 }, // o alto manda na linha
      { span: 1, height: 80 },
    ], grade)
    expect(posicoes[2]).toEqual({ left: 0, top: 274 })
  })
})

describe('ordemArrastada', () => {
  it('tira de um lugar e enfia no outro', () => {
    expect(ordemArrastada(5, 4, 0)).toEqual([4, 0, 1, 2, 3])
    expect(ordemArrastada(5, 0, 2)).toEqual([1, 2, 0, 3, 4])
  })

  it('sem movimento, a ordem é a mesma', () => {
    expect(ordemArrastada(3, 1, 1)).toEqual([0, 1, 2])
    expect(ordemArrastada(3, -1, 1)).toEqual([0, 1, 2])
  })
})

describe('previaDoArrasto', () => {
  it('levar o último bloco para o começo empurra todos os outros para baixo', () => {
    // auditoria (índice 4, meia linha de 160) vai para o lugar de ações.
    // Ordem nova: [auditoria, ações, números, cursos, incompletos].
    expect(previaDoArrasto(PAINEL, 4, 0, 4)).toEqual({ x: 0, y: -512 })
    // ações abre a linha de baixo da auditoria: 160 de altura + 24 de vão.
    expect(previaDoArrasto(PAINEL, 4, 0, 0)).toEqual({ x: 0, y: 184 })
  })

  it('o bloco que trocou de coluna anda para o lado, não só para baixo', () => {
    // cursos (2) vai para o lugar de incompletos (3): eles trocam de coluna.
    expect(previaDoArrasto(PAINEL, 2, 3, 2)).toEqual({ x: 512, y: 0 })
    expect(previaDoArrasto(PAINEL, 2, 3, 3)).toEqual({ x: -512, y: 0 })
  })

  it('quem não sai do lugar não ganha transform', () => {
    // Trocar cursos com incompletos não mexe em ações nem em números.
    expect(previaDoArrasto(PAINEL, 2, 3, 0)).toBeNull()
    expect(previaDoArrasto(PAINEL, 2, 3, 1)).toBeNull()
  })

  it('sem arrasto de verdade, ninguém se mexe', () => {
    for (let i = 0; i < PAINEL.length; i++) {
      expect(previaDoArrasto(PAINEL, 2, 2, i)).toBeNull()
    }
  })

  it('nunca estica nem encolhe: a prévia é só deslocamento', () => {
    // A conta devolve x/y e nada de escala — foi a escala das estratégias
    // prontas do @dnd-kit que deformava os cartões.
    const andar = previaDoArrasto(PAINEL, 4, 0, 0)
    expect(Object.keys(andar!).sort()).toEqual(['x', 'y'])
  })
})
