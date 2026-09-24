// Lê de volta o CSV que o backend gera, para o mesmo dado virar PDF sem que a
// tela precise conhecer as colunas de cada relatório. O backend continua sendo
// a única fonte das colunas: o PDF é outra forma de imprimir a MESMA planilha.
//
// Formato gerado lá: BOM UTF-8, separador ";", CRLF, toda célula entre aspas e
// aspas internas dobradas ("").

const SEPARADOR = ';'

/** Uma tabela do arquivo: título (só no relatório consolidado), cabeçalho e linhas. */
export type CsvSection = {
  title: string | null
  header: string[]
  rows: string[][]
}

/**
 * Quebra o texto em linhas de células. Aspas protegem separador e quebra de
 * linha, então não dá para simplesmente dividir por ";" e "\n".
 */
export function parseCsv(text: string): string[][] {
  const limpo = text.replace(/^\ufeff/, '')
  const linhas: string[][] = []
  let linha: string[] = []
  let celula = ''
  let dentroDeAspas = false

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]

    if (dentroDeAspas) {
      if (c === '"') {
        // "" dentro do campo é uma aspa de verdade.
        if (limpo[i + 1] === '"') { celula += '"'; i++ } else dentroDeAspas = false
      } else if (c !== '\r') {
        // O CRLF da planilha vira só "\n" dentro da célula: o que interessa é
        // a quebra, e o \r sobrando apareceria como lixo no PDF.
        celula += c
      }
      continue
    }

    if (c === '"') { dentroDeAspas = true; continue }
    if (c === SEPARADOR) { linha.push(celula); celula = ''; continue }
    if (c === '\n') {
      linha.push(celula)
      linhas.push(linha)
      linha = []
      celula = ''
      continue
    }
    if (c === '\r') continue
    celula += c
  }

  // Última linha sem quebra no fim.
  if (celula !== '' || linha.length > 0) {
    linha.push(celula)
    linhas.push(linha)
  }
  return linhas
}

/** Linha vazia de verdade (só células em branco). */
function vazia(linha: string[]): boolean {
  return linha.every(c => c.trim() === '')
}

/**
 * Separa o arquivo em tabelas. O relatório consolidado tem várias, cada uma
 * aberta por uma linha de uma célula só (o título); os outros relatórios têm
 * uma tabela sem título. Uma linha de uma célula só nunca é dado aqui, porque
 * toda planilha exportada tem mais de uma coluna.
 */
export function parseCsvSections(text: string): CsvSection[] {
  const secoes: CsvSection[] = []
  let atual: CsvSection | null = null

  for (const linha of parseCsv(text)) {
    if (vazia(linha)) continue

    const ehTitulo = linha.length === 1 && linha[0].trim() !== ''
    if (ehTitulo) {
      atual = { title: linha[0].trim(), header: [], rows: [] }
      secoes.push(atual)
      continue
    }

    if (!atual) {
      atual = { title: null, header: linha, rows: [] }
      secoes.push(atual)
      continue
    }
    if (atual.header.length === 0) atual.header = linha
    else atual.rows.push(linha)
  }

  return secoes.filter(s => s.header.length > 0)
}

/**
 * As colunas que cabem no PDF. Uma planilha de pessoas tem 40 colunas; em
 * papel isso vira uma fileira de letras miúdas. Então o PDF leva as colunas de
 * identificação e contato — as que fazem alguém reconhecer o registro — e
 * quem precisa do resto continua abrindo o CSV.
 */
const COLUNAS_PREFERIDAS = [
  'Nome', 'Razão social', 'Nome fantasia', 'Título', 'Descrição',
  'CPF', 'CNPJ', 'Usuário', 'Nº do evento',
  'Telefone', 'E-mail',
  'Situação de associado', 'Associado em dia', 'Associado até',
  'Tipo de membro', 'Regra', 'Cidade', 'Data', 'Início', 'Valor',
]

/** No máximo isto de colunas por tabela: mais que isso não se lê no papel. */
const MAX_COLUNAS = 7

/**
 * Quanto cada coluna pesa na largura da tabela do PDF. Nome ocupa espaço;
 * CPF e telefone têm tamanho fixo e curto. Dar a todos a mesma fatia gasta
 * papel com documento e espreme justamente o nome, que é o que se procura.
 */
const PESO_POR_COLUNA: { termos: string[]; peso: number }[] = [
  { termos: ['Nome', 'Razão social', 'Nome fantasia', 'Título', 'Descrição'], peso: 3 },
  { termos: ['E-mail', 'Cidade', 'Observações'], peso: 2 },
  { termos: ['CPF', 'CNPJ', 'Telefone', 'Data', 'Início', 'Valor', 'Nº do evento'], peso: 1 },
]

export function pesoDaColuna(cabecalho: string): number {
  return PESO_POR_COLUNA.find(g => g.termos.includes(cabecalho))?.peso ?? 1.5
}

export function pdfColumns(header: string[]): number[] {
  const escolhidas = COLUNAS_PREFERIDAS
    .map(nome => header.indexOf(nome))
    .filter(i => i >= 0)
    .sort((a, b) => a - b)
    .slice(0, MAX_COLUNAS)

  // Relatório cujas colunas não estão na lista (um novo, por exemplo): leva as
  // primeiras, que nesta exportação são sempre as que identificam o registro.
  return escolhidas.length > 0
    ? escolhidas
    : header.slice(0, MAX_COLUNAS).map((_, i) => i)
}
