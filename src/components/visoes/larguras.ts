// A largura de cada coluna da tabela da visão (decisão 007), PURA e testada.
//
// A regra (SR-145, revista na SR-153): a largura é decidida pelo que cabe na tela,
// não pelo número de colunas, e NENHUMA palavra sai cortada, nem no cabeçalho nem
// nas células ("Convênio s", "BAN CO", "Curso/SEN…", "Nome / Razão…").
//   1. Coluna de valor inteiro (Nº, data, dinheiro, CPF/CNPJ, telefone, CEP, sim/não,
//      e a de texto em que todo valor é um número só, como "44.555.666/0001-81")
//      nunca quebra nem encolhe: fica da largura do maior valor da página.
//   2. Coluna de texto quebra só entre palavras, e o piso dela é a maior palavra da
//      página. Só um "token" único muito longo (e-mail, URL: acima de
//      `TETO_DA_PALAVRA`) pode levar reticências, com o texto inteiro no `title`.
//   3. O cabeçalho cabe em até duas linhas, quebrando só entre palavras.
//   4. A coluna pode ter um piso próprio (`piso`): a Descrição e o Nome não ficam
//      estreitos a ponto de mostrar uma ou duas palavras por linha.
//   5. Se tudo cabe, o que sobra vai para as colunas de texto pelo `weight` (o mesmo
//      peso do PDF). Se não cabe, nada encolhe abaixo do piso: cada coluna fica com
//      o piso dela e a tabela rola de lado, com "Ações" presa à direita. Rolar é
//      melhor que cortar (pedido do usuário depois da SR-152).

/** O tipo do catálogo que nunca quebra linha (o valor sai inteiro). */
const TIPOS_INTEIROS = new Set(['number', 'money', 'date', 'datetime', 'wallclock', 'cpf', 'cnpj', 'cep', 'phone', 'cns', 'boolean'])

export function ehValorInteiro(type: string): boolean {
  return TIPOS_INTEIROS.has(type)
}

/** As letras da tabela: o corpo (13 px; a Descrição em negrito médio), o Nº e a data (mono 12 px), o valor (mono 13 px), o cabeçalho (12 px). */
export type Fonte = 'texto' | 'texto-forte' | 'mono-pequena' | 'mono' | 'cabecalho'

export type Medidor = (texto: string, fonte: Fonte) => number

export type ColunaParaMedir = {
  key: string
  label: string
  type: string
  weight: number
  /** A letra das células (a do realce, nas seis chaves de realce). */
  fonte: Fonte
  /** Espaço fixo dentro da célula além do texto (ícone do tipo, ponto da categoria…). */
  extra?: number
  /** A coluna nunca fica mais estreita que isso (com o respiro). */
  piso?: number
}

/** O respiro da célula (`px-1.5` dos dois lados, na tabela da visão). */
export const RESPIRO = 12
/**
 * A maior palavra que uma coluna de texto mostra inteira. Acima disso só fica um
 * "token" único (endereço de e-mail, URL…), que leva reticências com o texto no `title`.
 */
export const TETO_DA_PALAVRA = 260
/** Nenhuma coluna fica mais estreita que isso (o "Nº" com "—"). */
export const MINIMO_DA_COLUNA = 44
/**
 * Folga sobre a medida do canvas: o navegador arredonda a largura das letras de um
 * jeito um pouco diferente, e meio pixel a menos já põe a palavra na linha de baixo.
 */
const FOLGA = 1

/** O texto em palavras (só espaço separa: "Curso/SENAR" é uma palavra). */
export function palavras(texto: string): string[] {
  return texto.split(/\s+/).filter(Boolean)
}

const SO_NUMERO = /^[\d.,/()+\-–—]+$/

/**
 * A coluna sai inteira (não quebra nem encolhe)? Pelo tipo do catálogo ou, na de
 * texto, quando todo valor da página é um número só (CNPJ/CPF, telefone, Nº anterior).
 */
export function colunaInteira(type: string, textos: readonly string[]): boolean {
  if (ehValorInteiro(type)) return true
  const cheios = textos.map(t => t.trim()).filter(t => t && t !== '—')
  return cheios.length > 0 && cheios.every(t => SO_NUMERO.test(t))
}

/**
 * A largura que o rótulo do cabeçalho pede para caber em até duas linhas, quebrando
 * só entre palavras ("Nome / Razão" | "social"). Uma palavra só: ela inteira.
 */
export function larguraDoRotulo(rotulo: string, medir: Medidor): number {
  const ps = palavras(rotulo)
  if (ps.length === 0) return 0
  if (ps.length === 1) return medir(ps[0], 'cabecalho')
  let melhor = Infinity
  for (let k = 1; k < ps.length; k++) {
    const linhas = Math.max(medir(ps.slice(0, k).join(' '), 'cabecalho'), medir(ps.slice(k).join(' '), 'cabecalho'))
    melhor = Math.min(melhor, linhas)
  }
  return melhor
}

/**
 * O piso da coluna: o maior valor (inteira) ou a maior palavra (texto, até o
 * `TETO_DA_PALAVRA`), o rótulo em até duas linhas e o `piso` próprio dela.
 */
export function larguraPedida(col: ColunaParaMedir, textos: readonly string[], medir: Medidor): number {
  const extra = col.extra ?? 0
  const rotulo = larguraDoRotulo(col.label, medir)
  let conteudo = 0
  if (colunaInteira(col.type, textos)) {
    for (const t of textos) if (t) conteudo = Math.max(conteudo, medir(t.trim(), col.fonte))
  } else {
    for (const t of textos) for (const p of palavras(t)) conteudo = Math.max(conteudo, Math.min(TETO_DA_PALAVRA, medir(p, col.fonte)))
  }
  return Math.max(MINIMO_DA_COLUNA, col.piso ?? 0, Math.ceil(Math.max(rotulo, conteudo + extra) + FOLGA + RESPIRO))
}

export type Larguras = {
  larguras: number[]
  /** true = os pisos não cabem: a tabela rola de lado. */
  rola: boolean
  /** A soma das colunas (sem a de Ações). */
  total: number
}

/**
 * As larguras para `disponivel` px (a largura da tabela menos a coluna Ações).
 * `pisos[i]` = `larguraPedida` da coluna i: nenhuma coluna fica abaixo dele.
 */
export function largurasDasColunas(
  colunas: readonly (Pick<ColunaParaMedir, 'type' | 'weight'> & { inteira?: boolean })[],
  pisos: readonly number[],
  disponivel: number,
): Larguras {
  const texto = colunas.map(c => !(c.inteira ?? ehValorInteiro(c.type)))
  const soma = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
  const pedido = soma(pisos)

  // Cabe tudo: a sobra vai para as de texto pelo peso (sem coluna de texto, para todas).
  if (pedido <= disponivel) {
    const sobra = disponivel - pedido
    const recebem = texto.some(Boolean) ? texto : colunas.map(() => true)
    const pesos = colunas.map((c, i) => (recebem[i] ? Math.max(0.5, c.weight || 1) : 0))
    const totalDosPesos = soma(pesos) || 1
    const larguras = pisos.map((p, i) => Math.floor(p + (sobra * pesos[i]) / totalDosPesos))
    return { larguras, rola: false, total: soma(larguras) }
  }

  // Não cabe: nada encolhe abaixo do piso (encolher cortava palavras); a tabela rola.
  return { larguras: [...pisos], rola: true, total: pedido }
}

/**
 * Sem o canvas (jsdom dos testes): uma estimativa por letra, a mesma ordem de
 * grandeza da Geist (maiúscula mais larga, pontuação mais estreita).
 */
export function medidorEstimado(texto: string, fonte: Fonte): number {
  const tamanho = fonte === 'cabecalho' || fonte === 'mono-pequena' ? 12 : 13
  if (fonte === 'mono' || fonte === 'mono-pequena') return texto.length * tamanho * 0.6
  let em = 0
  for (const ch of texto) {
    if (/[.,:;/|'!il1\-()]/.test(ch)) em += 0.3
    else if (/[A-ZÁÂÃÀÉÊÍÓÔÕÚÇMW]/.test(ch)) em += 0.68
    else if (/\d/.test(ch)) em += 0.58
    else em += 0.53
  }
  return em * tamanho
}
