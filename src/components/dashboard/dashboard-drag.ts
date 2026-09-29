// Prévia do arrasto no Painel Geral.
//
// Por que não dá para usar as estratégias prontas do @dnd-kit: elas montam a
// prévia PERMUTANDO os retângulos medidos (o bloco A recebe o retângulo do
// bloco B) e ainda aplicam scaleX/scaleY. Isso só fecha quando todos os itens
// têm o mesmo tamanho. No painel não têm: a agenda ocupa as 4 colunas e é alta,
// "Últimas ações" ocupa 2 e é baixinha — os cartões esticavam e caíam uns por
// cima dos outros.
//
// Aqui a conta é outra: a gente REFAZ o empacotamento da grade na ordem nova e
// devolve a distância de onde o bloco está até onde ele vai ficar. Como isso é
// só `transform`, nada reflui — e o @dnd-kit mede os alvos com
// `getTransformAgnosticClientRect`, congelados no começo do arrasto, então a
// prévia não muda o alvo debaixo do cursor (foi o que fez os blocos ficarem se
// alternando quando a ordem mudava de verdade durante o gesto).

import { COLUNAS, SPANS, type DashboardSpan } from '@/components/dashboard/dashboard-prefs'

/** O que a gente usa do retângulo medido de um bloco. */
export type Medida = { left: number; top: number; width: number; height: number }

/** A grade lida a partir das medidas: quantas colunas, onde começa e o vão. */
export type Grade = {
  colunas: 1 | typeof COLUNAS
  left: number
  top: number
  larguraColuna: number
  vao: number
}

const VAO_PADRAO = 24 // `gap-6` do Tailwind, usado quando não dá para deduzir.

/** Menor folga entre um bloco e o vizinho de lado, na mesma linha. */
function vaoHorizontal(rects: readonly Medida[]): number | null {
  let menor = Infinity
  for (const a of rects) {
    for (const b of rects) {
      // Mesma linha: os topos batem (a grade alinha os itens da linha).
      if (Math.abs(a.top - b.top) > 1) continue
      const folga = b.left - (a.left + a.width)
      if (folga > 0.5 && folga < menor) menor = folga
    }
  }
  return Number.isFinite(menor) ? menor : null
}

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
 * Descobre a grade pelas medidas dos blocos: no computador são COLUNAS (4), no
 * celular 1 (lá todo bloco ocupa a linha inteira e não há largura menor).
 */
export function lerGrade(rects: readonly Medida[]): Grade | null {
  if (rects.length === 0) return null

  const left = Math.min(...rects.map(r => r.left))
  const top = Math.min(...rects.map(r => r.top))
  const total = Math.max(...rects.map(r => r.left + r.width)) - left
  if (total <= 0) return null

  // O vão é o mesmo nos dois sentidos (`gap-6`): serve o de lado, e na falta
  // dele (nenhuma linha com dois blocos) o de cima para baixo.
  const vao = vaoHorizontal(rects) ?? vaoVertical(rects)

  // Todo bloco ocupando a largura toda: ou é o celular (1 coluna), ou são todos
  // de linha inteira — dá no mesmo, um por linha.
  if (Math.min(...rects.map(r => r.width)) > total - 1) {
    return { colunas: 1, left, top, larguraColuna: total, vao }
  }
  return {
    colunas: COLUNAS,
    left,
    top,
    larguraColuna: (total - vao * (COLUNAS - 1)) / COLUNAS,
    vao,
  }
}

/** Quantas colunas o bloco ocupa, pela largura medida. */
export function spanMedido(rect: Medida, grade: Grade): DashboardSpan {
  if (grade.colunas === 1) return COLUNAS
  // largura = span*coluna + (span-1)*vão  ⇒  span = (largura+vão)/(coluna+vão)
  const bruto = Math.round((rect.width + grade.vao) / (grade.larguraColuna + grade.vao))
  const menor = SPANS[0]
  const maior = SPANS[SPANS.length - 1]
  return Math.min(maior, Math.max(menor, bruto)) as DashboardSpan
}

/**
 * Empacota os blocos na grade, na ordem dada, e devolve onde cada um começa.
 * É a mesma regra do CSS: enche a linha da esquerda para a direita e, quando um
 * bloco de linha inteira não cabe ao lado do que já está lá, ele desce.
 */
export function posicoesDaGrade(
  itens: readonly { span: DashboardSpan; height: number }[],
  grade: Grade,
): { left: number; top: number }[] {
  const saida: { left: number; top: number }[] = []
  let linhaTop = grade.top
  let usadas = 0 // colunas já ocupadas na linha aberta
  let alturaLinha = 0

  function fecharLinha() {
    linhaTop += alturaLinha + grade.vao
    usadas = 0
    alturaLinha = 0
  }

  for (const item of itens) {
    // No celular não existe meia largura: todo bloco toma a linha.
    const span = grade.colunas === 1 ? COLUNAS : item.span
    // Não coube no que sobrou da linha: desce, e o resto dela fica vazio.
    if (usadas > 0 && usadas + span > COLUNAS) fecharLinha()

    saida.push({
      left: grade.left + usadas * (grade.larguraColuna + grade.vao),
      top: linhaTop,
    })
    alturaLinha = Math.max(alturaLinha, item.height)

    usadas += span
    if (usadas >= COLUNAS) fecharLinha()
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
