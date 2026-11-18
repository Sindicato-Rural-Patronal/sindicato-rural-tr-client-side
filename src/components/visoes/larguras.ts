// A largura de cada coluna da tabela da visão (decisão 007), PURA e testada.
//
// A regra que a SR-145 pediu: a largura é decidida pelo que cabe na tela, não pelo
// número de colunas, e nenhuma palavra se parte no meio ("Convênio s", "BAN CO").
//   1. Coluna de valor inteiro (Nº, data, dinheiro, CPF/CNPJ, telefone, CEP, sim/não,
//      e a de texto em que todo valor é um número só, como "44.555.666/0001-81")
//      nunca quebra nem encolhe: fica da largura do maior valor da página.
//   2. Coluna de texto quebra só entre palavras: o mínimo dela é a maior palavra.
//   3. Se tudo cabe, o que sobra vai para as colunas de texto pelo `weight` (o mesmo
//      peso do PDF).
//   4. Se não cabe, as colunas de texto encolhem até um nível comum, multiplicado
//      pelo peso (a Descrição, peso 4, e o Nome, peso 3, encolhem por último; as que
//      pedem pouco ficam inteiras), nunca abaixo de um piso; a palavra que não cabe
//      ganha reticências, com o texto inteiro no `title`. Assim a visão Contabilidade
//      (9 colunas) cabe a 1280 px.
//   5. Se nem os pisos cabem, cada coluna fica com a largura que pede e a tabela rola
//      de lado, com "Ações" presa à direita.

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
}

/** O respiro da célula (`px-1.5` dos dois lados, na tabela da visão). */
export const RESPIRO = 12
/** Até onde uma coluna de texto encolhe antes de a tabela rolar. */
export const PISO_DO_TEXTO = 72
/** Maior palavra que uma coluna de texto tenta mostrar inteira (endereço de e-mail, URL…). */
export const TETO_DA_PALAVRA = 200
/** Nenhuma coluna fica mais estreita que isso (o "Nº" com "—"). */
export const MINIMO_DA_COLUNA = 44

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

/** A largura que a coluna pede: o maior valor (inteira) ou a maior palavra (texto), com o rótulo. */
export function larguraPedida(col: ColunaParaMedir, textos: readonly string[], medir: Medidor): number {
  const extra = col.extra ?? 0
  const rotulo = Math.max(0, ...palavras(col.label).map(p => medir(p, 'cabecalho')))
  let conteudo = 0
  if (colunaInteira(col.type, textos)) {
    for (const t of textos) if (t) conteudo = Math.max(conteudo, medir(t.trim(), col.fonte))
  } else {
    for (const t of textos) for (const p of palavras(t)) conteudo = Math.max(conteudo, Math.min(TETO_DA_PALAVRA, medir(p, col.fonte)))
  }
  return Math.max(MINIMO_DA_COLUNA, Math.ceil(Math.max(rotulo, conteudo + extra) + RESPIRO))
}

export type Larguras = {
  larguras: number[]
  /** true = não coube nem com os pisos: a tabela rola de lado. */
  rola: boolean
  /** A soma das colunas (sem a de Ações). */
  total: number
}

/**
 * As larguras para `disponivel` px (a largura da tabela menos a coluna Ações).
 * `pedidas[i]` = `larguraPedida` da coluna i.
 */
export function largurasDasColunas(
  colunas: readonly (Pick<ColunaParaMedir, 'type' | 'weight' | 'label'> & { inteira?: boolean })[],
  pedidas: readonly number[],
  disponivel: number,
  medir?: Medidor,
): Larguras {
  const texto = colunas.map(c => !(c.inteira ?? ehValorInteiro(c.type)))
  const soma = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
  const pedido = soma(pedidas)

  // 3. Cabe tudo: a sobra vai para as de texto pelo peso (sem coluna de texto, para todas).
  if (pedido <= disponivel) {
    const sobra = disponivel - pedido
    const recebem = texto.some(Boolean) ? texto : colunas.map(() => true)
    const pesos = colunas.map((c, i) => (recebem[i] ? Math.max(0.5, c.weight || 1) : 0))
    const totalDosPesos = soma(pesos) || 1
    const larguras = pedidas.map((p, i) => Math.floor(p + (sobra * pesos[i]) / totalDosPesos))
    return { larguras, rola: false, total: soma(larguras) }
  }

  // 4. Não cabe: as colunas de texto encolhem até um nível comum (as que pedem menos ficam inteiras).
  const pisos = pedidas.map((p, i) => {
    if (!texto[i]) return p
    // O piso nunca parte o rótulo: a maior palavra dele cabe.
    const rotulo = medir ? Math.ceil(Math.max(0, ...palavras(colunas[i].label).map(w => medir(w, 'cabecalho'))) + RESPIRO) : 0
    return Math.min(p, Math.max(PISO_DO_TEXTO, rotulo))
  })
  if (soma(pisos) <= disponivel) {
    const fixas = soma(pedidas.filter((_, i) => !texto[i]))
    const paraTexto = disponivel - fixas
    // Procura o nível L: Σ max(piso, min(pedida, L × peso)) = paraTexto.
    const peso = (i: number) => Math.sqrt(Math.max(0.5, colunas[i].weight || 1))
    const deTexto = pedidas.map((p, i) => ({ p, piso: pisos[i], i })).filter(x => texto[x.i])
    const largura = (x: { p: number; piso: number; i: number }, nivel: number) =>
      Math.max(x.piso, Math.min(x.p, nivel * peso(x.i)))
    let baixo = 0
    let alto = Math.max(...deTexto.map(x => x.p / peso(x.i)))
    for (let k = 0; k < 40; k++) {
      const meio = (baixo + alto) / 2
      const usado = soma(deTexto.map(x => largura(x, meio)))
      if (usado > paraTexto) alto = meio
      else baixo = meio
    }
    const larguras = pedidas.map((p, i) => (texto[i] ? Math.floor(largura({ p, piso: pisos[i], i }, baixo)) : p))
    return { larguras, rola: false, total: soma(larguras) }
  }

  // 5. Nem os pisos cabem: cada uma com o que pede, e a tabela rola.
  return { larguras: [...pedidas], rola: true, total: pedido }
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
