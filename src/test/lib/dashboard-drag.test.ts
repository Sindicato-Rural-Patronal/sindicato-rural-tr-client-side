import { describe, it, expect } from 'vitest'
import {
  lerGrade, ordemArrastada, posicoesDaGrade, previaDoArrasto, spanMedido, type Medida,
} from '@/components/dashboard/dashboard-drag'

// Um painel de verdade medido no computador: grade de 1000px com 4 colunas de
// 232 e vão de 24 (o `gap-6`). Daí as larguras: 2 colunas = 488, 3 = 744 e
// 4 = 1000. Ordem: dois blocos de linha inteira, dois de 2 colunas dividindo a
// linha e um de 2 colunas sozinho no fim.
const PAINEL: Medida[] = [
  { left: 0, top: 0, width: 1000, height: 100 },   // 0 ações       (4 colunas)
  { left: 0, top: 124, width: 1000, height: 140 }, // 1 números     (4 colunas)
  { left: 0, top: 288, width: 488, height: 200 },  // 2 cursos      (2 colunas)
  { left: 512, top: 288, width: 488, height: 200 },// 3 incompletos (2 colunas)
  { left: 0, top: 512, width: 488, height: 160 },  // 4 auditoria   (2 colunas)
]

// O mesmo painel no celular: uma coluna, todo bloco na linha inteira.
const CELULAR: Medida[] = [
  { left: 0, top: 0, width: 360, height: 100 },
  { left: 0, top: 116, width: 360, height: 140 },
  { left: 0, top: 272, width: 360, height: 200 },
]

describe('lerGrade', () => {
  it('lê as quatro colunas, a largura de uma e o vão pelas medidas', () => {
    expect(lerGrade(PAINEL)).toEqual({
      colunas: 4, left: 0, top: 0, larguraColuna: 232, vao: 24,
    })
  })

  it('com todos ocupando a linha toda, trata como uma coluna só', () => {
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
  it('tira as colunas de volta da largura medida', () => {
    const grade = lerGrade(PAINEL)!
    expect(spanMedido(PAINEL[0], grade)).toBe(4)
    expect(spanMedido(PAINEL[2], grade)).toBe(2)
    // 3 colunas = 3*232 + 2*24.
    expect(spanMedido({ left: 0, top: 0, width: 744, height: 10 }, grade)).toBe(3)
  })

  it('nunca devolve menos de 2 nem mais de 4 colunas', () => {
    const grade = lerGrade(PAINEL)!
    expect(spanMedido({ left: 0, top: 0, width: 232, height: 10 }, grade)).toBe(2)
    expect(spanMedido({ left: 0, top: 0, width: 5000, height: 10 }, grade)).toBe(4)
  })

  it('no celular todo bloco ocupa a linha', () => {
    const grade = lerGrade(CELULAR)!
    expect(spanMedido(CELULAR[0], grade)).toBe(4)
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

  it('duas de 2 colunas dividem a linha; a terceira desce', () => {
    const grade = lerGrade(PAINEL)!
    const posicoes = posicoesDaGrade([
      { span: 2, height: 100 },
      { span: 2, height: 250 }, // o mais alto manda na altura da linha
      { span: 2, height: 80 },
    ], grade)
    expect(posicoes).toEqual([
      { left: 0, top: 0 }, { left: 512, top: 0 }, { left: 0, top: 274 },
    ])
  })

  it('o que não cabe no resto da linha desce e deixa o vão vazio', () => {
    const grade = lerGrade(PAINEL)!
    // 3 colunas + 2 colunas não cabem juntas (passa de 4): a de 2 desce, e
    // sobra uma coluna vazia à direita da de 3. É o preço de permitir 3.
    const posicoes = posicoesDaGrade([
      { span: 3, height: 160 },
      { span: 2, height: 100 },
    ], grade)
    expect(posicoes).toEqual([{ left: 0, top: 0 }, { left: 0, top: 184 }])
  })

  it('2 + 2 enche a linha certinho', () => {
    const grade = lerGrade(PAINEL)!
    expect(posicoesDaGrade([
      { span: 2, height: 100 },
      { span: 2, height: 100 },
      { span: 4, height: 90 },
    ], grade)).toEqual([
      { left: 0, top: 0 }, { left: 512, top: 0 }, { left: 0, top: 124 },
    ])
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
    // cursos (2) vai para o lugar de incompletos (3): trocam de coluna.
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
