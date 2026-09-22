// Prévia do arrasto no Painel Geral.
//
// Por que não dá para usar as estratégias prontas do @dnd-kit: elas montam a
// prévia PERMUTANDO os retângulos medidos (o bloco A recebe o retângulo do
// bloco B) e ainda aplicam scaleX/scaleY. Isso só fecha quando todos os itens
// têm o mesmo tamanho. No painel não têm: a agenda ocupa a linha inteira e é
// alta, "Últimas ações" é meia linha e baixinha — os cartões esticavam e caíam
// uns por cima dos outros.
//
// Aqui a conta é outra: a gente REFAZ o empacotamento da grade na ordem nova e
// devolve a distância de onde o bloco está até onde ele vai ficar. Como isso é
// só `transform`, nada reflui — e o @dnd-kit mede os alvos com
// `getTransformAgnosticClientRect`, congelados no começo do arrasto, então a
// prévia não muda o alvo debaixo do cursor (foi o que fez os blocos ficarem se
// alternando quando a ordem mudava de verdade durante o gesto).

/** O que a gente usa do retângulo medido de um bloco. */
export type Medida = { left: number; top: number; width: number; height: number }

/** A grade lida a partir das medidas: quantas colunas, onde começa e o vão. */
export type Grade = {
  colunas: 1 | 2
  left: number
  top: number
  larguraColuna: number
  vao: number
}

const VAO_PADRAO = 24 // `gap-6` do Tailwind, usado quando não dá para deduzir.

/** Menor distância vertical entre um bloco e o de baixo (o `gap` da grade). */
function vaoVertical(rects: readonly Medida[]): number {
  let menor = Infinity
  for (const a of rects) {
    for (const b of rects) {
      const folga = b.top - (a.top + a.height)
      if (folga > 0.5 && folga < menor) menor = folga
    }
  }
  return Number.isFinite(menor) ? menor : VAO_PADRAO
}

/**
 * Descobre a grade pelas medidas dos blocos: no computador são 2 colunas, no
 * celular 1 (lá todo bloco ocupa a linha inteira e não há meia largura).
 */
export function lerGrade(rects: readonly Medida[]): Grade | null {
  if (rects.length === 0) return null

  const left = Math.min(...rects.map(r => r.left))
  const top = Math.min(...rects.map(r => r.top))
  const total = Math.max(...rects.map(r => r.left + r.width)) - left
  if (total <= 0) return null

  const menorLargura = Math.min(...rects.map(r => r.width))
  // Bloco de meia linha mede pouco mais de metade da grade. Se o mais estreito
  // ainda passa de 60% dela, não há meia largura nenhuma: é uma coluna só.
  if (menorLargura > total * 0.6) {
    return { colunas: 1, left, top, larguraColuna: total, vao: vaoVertical(rects) }
  }
  return { colunas: 2, left, top, larguraColuna: menorLargura, vao: total - menorLargura * 2 }
}

/** Quantas colunas o bloco ocupa, pela largura medida. */
export function spanMedido(rect: Medida, grade: Grade): 1 | 2 {
  if (grade.colunas === 1) return 2
  return rect.width > grade.larguraColuna * 1.5 ? 2 : 1
}

/**
 * Empacota os blocos na grade, na ordem dada, e devolve onde cada um começa.
 * É a mesma regra do CSS: enche a linha da esquerda para a direita e, quando um
 * bloco de linha inteira não cabe ao lado do que já está lá, ele desce.
 */
export function posicoesDaGrade(
  itens: readonly { span: 1 | 2; height: number }[],
  grade: Grade,
): { left: number; top: number }[] {
  const saida: { left: number; top: number }[] = []
  let linhaTop = grade.top
  let coluna: 0 | 1 = 0
  let alturaLinha = 0

  function fecharLinha() {
    linhaTop += alturaLinha + grade.vao
    coluna = 0
    alturaLinha = 0
  }

  for (const item of itens) {
    // No celular não existe meia largura: todo bloco toma a linha.
    const span = grade.colunas === 1 ? 2 : item.span
    // Bloco de linha inteira não divide linha com ninguém.
    if (span === 2 && coluna === 1) fecharLinha()

    saida.push({
      left: grade.left + coluna * (grade.larguraColuna + grade.vao),
      top: linhaTop,
    })
    alturaLinha = Math.max(alturaLinha, item.height)

    if (span === 2 || coluna === 1) fecharLinha()
    else coluna = 1
  }

  return saida
}

/** A ordem depois de tirar o bloco de `from` e enfiá-lo em `to` (igual ao dropBlock). */
export function ordemArrastada(tamanho: number, from: number, to: number): number[] {
  const indices = Array.from({ length: tamanho }, (_, i) => i)
  if (from < 0 || to < 0 || from >= tamanho || to >= tamanho || from === to) return indices
  indices.splice(to, 0, ...indices.splice(from, 1))
  return indices
}

/**
 * Quanto o bloco de índice `index` precisa andar para mostrar onde vai parar.
 * `null` quando não sai do lugar (o @dnd-kit então não escreve transform nenhum).
 */
export function previaDoArrasto(
  rects: readonly Medida[],
  activeIndex: number,
  overIndex: number,
  index: number,
): { x: number; y: number } | null {
  const atual = rects[index]
  if (!atual || activeIndex === overIndex) return null

  const grade = lerGrade(rects)
  if (!grade) return null

  const nova = ordemArrastada(rects.length, activeIndex, overIndex)
  const posicoes = posicoesDaGrade(
    nova.map(i => ({ span: spanMedido(rects[i], grade), height: rects[i].height })),
    grade,
  )

  const destino = posicoes[nova.indexOf(index)]
  if (!destino) return null

  const x = destino.left - atual.left
  const y = destino.top - atual.top
  // Sem movimento não vale mexer no bloco (evita transform de 0px e o repinte).
  return Math.abs(x) < 0.5 && Math.abs(y) < 0.5 ? null : { x, y }
}
