// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  RelatorioJsonDocument, fracoesDasColunas, larguraDaPalavra, larguraUtilDaColuna, largurasDasColunas, layoutDoPdf,
  linhaDoModeloEFiltros, minimosDasColunas, quebraDaColuna, textoDaCelula,
} from '@/lib/relatorio-pdf'
import type { RelatorioColuna, RelatorioJson } from '@/lib/export'

// PDF do montador (decisão 006): desenhado do JSON da API, só com as colunas
// escolhidas. Em pé até 5 colunas, deitado com mais; letra 8/7/6 pt.

function relatorio(colunas: number, linhas: number, over: Partial<RelatorioJson> = {}): RelatorioJson {
  const columns = Array.from({ length: colunas }, (_, i) => ({ key: `c${i}`, label: `Coluna ${i + 1}`, type: 'text' }))
  return {
    title: 'Pessoas',
    filename: 'pessoas.pdf',
    count: linhas,
    filters: 'Busca: silva',
    modelo: 'Nome e CPF',
    columns,
    rows: Array.from({ length: linhas }, (_, n) => columns.map((_, i) => `PESSOA ${n} · ${i}`)),
    ...over,
  }
}

type Pdf = Awaited<ReturnType<typeof renderToBuffer>>

/** Orientação da primeira página: /MediaBox [0 0 largura altura]. */
function primeiraPagina(buf: Pdf): { largura: number; altura: number } {
  const m = buf.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
  return { largura: Number(m?.[1]), altura: Number(m?.[2]) }
}

function paginas(buf: Pdf): number {
  return Number(buf.toString('latin1').match(/\/Count\s+(\d+)/)?.[1])
}

/** Um byte por letra (latin1), como o WinAnsi da Helvetica do PDF. */
const latin1 = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join('')

/**
 * Os trechos de texto do PDF, um por linha desenhada: cada `[<hex> …] TJ` das
 * páginas (comprimidas), com as letras da Helvetica (WinAnsi, uma por byte).
 */
async function trechosDoPdf(buf: Pdf): Promise<string[]> {
  const bruto = buf.toString('latin1')
  const trechos: string[] = []
  // O tamanho vem no `/Length` do dicionário (o zlib recusa o "\n" antes do endstream).
  for (const m of bruto.matchAll(/\/Length (\d+)[^]*?>>\s*stream\r?\n/g)) {
    const inicio = m.index + m[0].length
    const comprimido = new Uint8Array(buf.subarray(inicio, inicio + Number(m[1])))
    let conteudo: string
    try {
      const fluxo = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate'))
      conteudo = latin1(new Uint8Array(await new Response(fluxo).arrayBuffer()))
    } catch {
      continue
    }
    for (const tj of conteudo.matchAll(/\[(.*?)\] TJ/g)) {
      const hex = [...tj[1].matchAll(/<([0-9a-f]*)>/g)].map(h => h[1]).join('')
      trechos.push((hex.match(/../g) ?? []).map(h => String.fromCharCode(parseInt(h, 16))).join(''))
    }
  }
  return trechos
}

/** O espaço que não separa, que o PDF usa para não quebrar a linha. */
const NBSP = String.fromCharCode(0xa0)

/** Largura da tabela no A4 deitado: 841,89 − 2 × 24 de margem. */
const TABELA_DEITADA = 841.89 - 2 * 24

describe('layoutDoPdf', () => {
  it('até 5 colunas em pé; com mais, deitado', () => {
    expect(layoutDoPdf(1).orientation).toBe('portrait')
    expect(layoutDoPdf(5).orientation).toBe('portrait')
    expect(layoutDoPdf(6).orientation).toBe('landscape')
  })

  it('letra de 8 pt até 8 colunas, 7 até 12 e 6 acima', () => {
    expect(layoutDoPdf(8).fontSize).toBe(8)
    expect(layoutDoPdf(9).fontSize).toBe(7)
    expect(layoutDoPdf(12).fontSize).toBe(7)
    expect(layoutDoPdf(13).fontSize).toBe(6)
  })
})

describe('larguras e cabeçalho', () => {
  it('usa o weight da coluna e, sem ele, o peso do tipo', () => {
    expect(largurasDasColunas([
      { key: 'a', label: 'Nome', type: 'text', weight: 3 },
      { key: 'b', label: 'CPF', type: 'text', weight: 1 },
    ])).toEqual(['75%', '25%'])
    const [nome, assinatura] = largurasDasColunas([
      { key: 'a', label: 'Nome', type: 'text' },
      { key: 'b', label: 'Assinatura', type: 'blank' },
    ]).map(parseFloat)
    expect(assinatura).toBeGreaterThan(nome)
  })

  it('a linha do modelo e dos filtros só aparece com algum dos dois', () => {
    expect(linhaDoModeloEFiltros({ modelo: 'Nome e CPF', filters: 'Busca: silva' }))
      .toBe('Modelo: Nome e CPF · Filtros: Busca: silva')
    expect(linhaDoModeloEFiltros({ modelo: null, filters: null })).toBeNull()
    expect(linhaDoModeloEFiltros({ modelo: null, filters: 'Seleção: 8 registros' })).toBe('Seleção: 8 registros')
  })
})

describe('quebra de palavra nas células', () => {
  it('mede a palavra com as larguras da Helvetica; acento não muda a largura', () => {
    // o 556 + r 333 + d 556 + e 556 + m 833 = 2.834 milésimos de 8 pt.
    expect(larguraDaPalavra('ordem', 8)).toBeCloseTo(22.672, 3)
    expect(larguraDaPalavra('ordem', 8, true)).toBeGreaterThan(larguraDaPalavra('ordem', 8))
    expect(larguraDaPalavra('CONCEIÇÃO', 6)).toBe(larguraDaPalavra('CONCEICAO', 6))
  })

  it('palavra que cabe na coluna não se quebra (nada de "Nº de or-/dem")', () => {
    // A coluna Nº da Lista de presença: weight 1 de 10,4, A4 em pé.
    const util = larguraUtilDaColuna(1 / 10.4, 'portrait')
    const hifenizar = (p: string) => [p.slice(0, 2), p.slice(2)]
    expect(quebraDaColuna(util, 8, true)('ordem', hifenizar)).toEqual(['ordem'])
    expect(quebraDaColuna(30, 6)('CRISTINA', hifenizar)).toEqual(['CRISTINA'])
  })

  it('palavra que não cabe é hifenizada pelo react-pdf, como antes', () => {
    const hifenizar = () => ['maria.sil', 'va@gmail.com']
    expect(quebraDaColuna(20, 6)('maria.silva@gmail.com', hifenizar)).toEqual(['maria.sil', 'va@gmail.com'])
    // Sem a hifenização do react-pdf, fica inteira.
    expect(quebraDaColuna(20, 6)('maria.silva@gmail.com')).toEqual(['maria.silva@gmail.com'])
  })

  it('a largura útil desconta as margens da página e da célula', () => {
    // A4 deitado: 841,89 − 2 × 24 de margem = 793,89; menos 2 × 4 da célula.
    expect(larguraUtilDaColuna(1, 'landscape')).toBeCloseTo(785.89, 2)
    expect(larguraUtilDaColuna(0.5, 'portrait')).toBeCloseTo(265.64, 2)
  })
})

describe('largura mínima das colunas', () => {
  // O Padrão de Inscrições: 17 colunas, A4 deitado, letra de 6 pt.
  const inscricoes: RelatorioColuna[] = [
    { key: 'course', label: 'Curso', type: 'text', weight: 3 },
    { key: 'eventNumber', label: 'Nº do evento', type: 'text' },
    { key: 'courseStart', label: 'Início do curso', type: 'wallclock' },
    { key: 'name', label: 'Nome', type: 'text', weight: 3 },
    { key: 'cpf', label: 'CPF', type: 'cpf', weight: 2 },
    { key: 'email', label: 'E-mail', type: 'text', weight: 3 },
    { key: 'phone', label: 'Telefone', type: 'phone' },
    { key: 'birthDate', label: 'Nascimento', type: 'date', weight: 1.4 },
    { key: 'age', label: 'Idade', type: 'number', weight: 0.8 },
    { key: 'confirmed', label: 'Confirmada', type: 'boolean', weight: 1.25 },
    { key: 'attendance', label: 'Presença', type: 'text' },
    { key: 'activeMember', label: 'Associado (em dia)', type: 'boolean', weight: 0.8 },
    { key: 'partnerCompanies', label: 'Empresa parceira', type: 'list', weight: 3 },
    { key: 'boardPosition', label: 'Cargo na diretoria', type: 'text' },
    { key: 'publicContact', label: 'Contato público', type: 'text' },
    { key: 'hasFicha', label: '(Ficha) anexada', type: 'boolean', weight: 0.8 },
    { key: 'registeredAt', label: 'Inscrito em', type: 'datetime' },
  ]
  const linha = ['HORTA', 'EVT-1', '04/10/2026 08:00', 'ANA', '800.888.864-41', 'ana@x.com', '(44) 99999-0091',
    '10/01/1962', '64', 'Sim', 'Presente', 'Não', '', '', '', 'Não', '10/11/2026 15:32']
  const layout = { orientation: 'landscape', fontSize: 6 } as const

  it('nenhuma palavra do cabeçalho fica mais larga que a coluna', () => {
    const fracoes = fracoesDasColunas(inscricoes, [linha], layout)
    expect(fracoes.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    inscricoes.forEach((c, i) => {
      const util = larguraUtilDaColuna(fracoes[i], 'landscape')
      for (const palavra of c.label.split(' ')) {
        expect(larguraDaPalavra(palavra, 6, true), `${c.label}: ${palavra}`).toBeLessThanOrEqual(util)
      }
    })
  })

  it('datas e CPF cabem inteiros; o que sobra continua pelos pesos', () => {
    const fracoes = fracoesDasColunas(inscricoes, [linha], layout)
    const cpf = inscricoes.findIndex(c => c.key === 'cpf')
    expect(larguraDaPalavra('800.888.864-41', 6)).toBeLessThanOrEqual(larguraUtilDaColuna(fracoes[cpf], 'landscape'))
    // Curso e Nome têm o mesmo peso e nenhum dos dois precisou de mínimo.
    expect(fracoes[0]).toBeCloseTo(fracoes[3], 6)
    expect(minimosDasColunas(inscricoes, [linha], 6)[cpf])
      .toBeCloseTo(larguraDaPalavra('800.888.864-41', 6) + 8.5, 6)
  })

  it('com colunas demais para os mínimos (57), fica só pelos pesos, como antes', () => {
    const muitas = Array.from({ length: 57 }, (_, i) => ({ key: `c${i}`, label: 'Naturalidade', type: 'text', weight: i ? 2 : 4 }))
    const fracoes = fracoesDasColunas(muitas, [], layout)
    expect(fracoes[0]).toBeCloseTo(4 / 116, 6)
    expect(fracoes[1]).toBeCloseTo(2 / 116, 6)
  })

  // SR-099: o mínimo media a maior PALAVRA do valor, e o telefone saía "(44)"
  // numa linha e "99999-0091" na de baixo (a data e hora, do mesmo jeito).
  it('telefone e data e hora cabem inteiros e não se separam no espaço', () => {
    const fracoes = fracoesDasColunas(inscricoes, [linha], layout)
    const minimos = minimosDasColunas(inscricoes, [linha], 6)
    for (const key of ['phone', 'courseStart', 'registeredAt']) {
      const i = inscricoes.findIndex(c => c.key === key)
      const util = larguraUtilDaColuna(fracoes[i], 'landscape')
      // O mínimo é o valor inteiro, com o espaço, e não a maior palavra dele.
      expect(minimos[i], key).toBeCloseTo(larguraDaPalavra(linha[i], 6) + 8.5, 6)
      expect(larguraDaPalavra(linha[i], 6), key).toBeLessThanOrEqual(util)
      // No desenho, o espaço vira o que não separa.
      expect(textoDaCelula(linha[i], inscricoes[i].type, util, 6), key).toBe(linha[i].replace(' ', NBSP))
    }
    // O espaço que não separa mede o mesmo que o espaço.
    expect(larguraDaPalavra(`(44)${NBSP}99999-0091`, 6)).toBe(larguraDaPalavra('(44) 99999-0091', 6))
  })

  it('texto e telefone fora do padrão continuam quebrando no espaço', () => {
    expect(textoDaCelula('ANA MARIA', 'text', 500, 6)).toBe('ANA MARIA')
    const recado = '44 99999-0091 RECADO COM JOAO'
    expect(textoDaCelula(recado, 'phone', 500, 6)).toBe(recado)
    const [minimo] = minimosDasColunas([{ key: 'phone', label: 'Fone', type: 'phone' }], [[recado]], 6)
    expect(minimo).toBeCloseTo(larguraDaPalavra('99999-0091', 6) + 8.5, 6)
  })

  it('sem lugar para os valores inteiros, o mínimo volta a ser a maior palavra, como na SR-092', () => {
    // 15 colunas de data e hora e um nome bem largo: os valores inteiros não
    // cabem na folha; as palavras cabem.
    const colunas: RelatorioColuna[] = [
      { key: 'name', label: 'Nome', type: 'text', weight: 20 },
      ...Array.from({ length: 15 }, (_, i) => ({ key: `d${i}`, label: 'Inscrito em', type: 'datetime', weight: 2 })),
    ]
    const valores = [['ANA', ...Array.from({ length: 15 }, () => '10/11/2026 15:32')]]
    const soma = (m: number[]) => m.reduce((a, b) => a + b, 0)
    const porPalavra = minimosDasColunas(colunas, valores, 6, false)
    expect(soma(minimosDasColunas(colunas, valores, 6))).toBeGreaterThan(TABELA_DEITADA)
    expect(soma(porPalavra)).toBeLessThan(TABELA_DEITADA)
    const fracoes = fracoesDasColunas(colunas, valores, layout)
    expect(fracoes[1] * TABELA_DEITADA).toBeCloseTo(porPalavra[1], 6)
    // A data cabe inteira; a hora pode ir para a linha de baixo.
    const util = larguraUtilDaColuna(fracoes[1], 'landscape')
    expect(larguraDaPalavra('10/11/2026', 6)).toBeLessThanOrEqual(util)
    expect(textoDaCelula('10/11/2026 15:32', 'datetime', util, 6)).toBe('10/11/2026 15:32')
  })

  it('Padrão de Pessoas (57 colunas): continua só pelos pesos, e o telefone quebra como antes', () => {
    // Os tipos das 57 colunas do Padrão de Pessoas, com o peso que a API manda.
    const tipos = ('text text cpf text text date date text text text text text text boolean text text text phone phone '
      + 'phone text text text text list text boolean date date text text boolean text text text text text text text '
      + 'text text text text text text text cep list list list boolean text text text number datetime datetime').split(' ')
    const peso: Record<string, number> = { text: 2, cpf: 2, date: 1.5, boolean: 1, phone: 2, list: 3, cep: 1.5, number: 1, datetime: 2 }
    const valor: Record<string, string> = {
      text: 'ADRIANA CRISTINA', cpf: '800.888.864-41', date: '10/01/1962', boolean: 'Sim', phone: '(44) 99999-0091',
      list: 'A | B', cep: '85990-000', number: '64', datetime: '10/11/2026 15:32',
    }
    const colunas = tipos.map((type, i) => ({ key: `c${i}`, label: `Campo ${i + 1}`, type, weight: peso[type] }))
    const fracoes = fracoesDasColunas(colunas, [tipos.map(t => valor[t])], layout)
    const somaDosPesos = colunas.reduce((s, c) => s + c.weight, 0)
    fracoes.forEach((f, i) => expect(f).toBeCloseTo(colunas[i].weight / somaDosPesos, 9))
    const fone = tipos.indexOf('phone')
    const util = larguraUtilDaColuna(fracoes[fone], 'landscape')
    expect(textoDaCelula('(44) 99999-0091', 'phone', util, 6)).toBe('(44) 99999-0091')
  })

  it('no PDF, o telefone e a data e hora saem numa linha só', { timeout: 30_000 }, async () => {
    const data = relatorio(17, 0, { title: 'Inscrições', columns: inscricoes, rows: [linha, linha], count: 2 })
    const trechos = await trechosDoPdf(await renderToBuffer(<RelatorioJsonDocument data={data} geradoEm="11/11/2026 10:00" />))
    for (const valor of ['(44) 99999-0091', '04/10/2026 08:00', '10/11/2026 15:32']) {
      expect(trechos.filter(t => t === valor.replace(' ', NBSP)), valor).toHaveLength(2)
    }
    // Nenhum pedaço solto ("(44) " numa linha, "99999-0091" na outra).
    expect(trechos.filter(t => t.startsWith('(44)') || t.startsWith('99999'))).toHaveLength(2)
  })
})

describe('relatório em PDF do JSON', { timeout: 30_000 }, () => {
  it('2 colunas: PDF válido, A4 em pé', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(2, 3)} geradoEm="11/11/2026 10:00" />)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    const { largura, altura } = primeiraPagina(buf)
    expect(altura).toBeGreaterThan(largura)
  })

  it('9 colunas: A4 deitado', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(9, 3)} geradoEm="11/11/2026 10:00" />)
    const { largura, altura } = primeiraPagina(buf)
    expect(largura).toBeGreaterThan(altura)
  })

  it('lista longa continua nas páginas seguintes', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(3, 150)} geradoEm="11/11/2026 10:00" />)
    expect(paginas(buf)).toBeGreaterThan(1)
  })

  it('sem linhas, sem modelo e com coluna de assinatura não quebra', async () => {
    const vazio = await renderToBuffer(
      <RelatorioJsonDocument data={relatorio(2, 0, { modelo: null, filters: null })} geradoEm="11/11/2026 10:00" />,
    )
    expect(vazio.subarray(0, 4).toString()).toBe('%PDF')
    const presenca = relatorio(3, 5, {
      columns: [
        { key: 'ordinal', label: 'Nº de ordem', type: 'number', weight: 1 },
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'signature', label: 'Assinatura', type: 'blank' },
      ],
      rows: Array.from({ length: 5 }, (_, i) => [String(i + 1), `PESSOA ${i}`, '']),
    })
    const buf = await renderToBuffer(<RelatorioJsonDocument data={presenca} geradoEm="11/11/2026 10:00" />)
    expect(paginas(buf)).toBe(1)
  })

  it('57 colunas com e-mail e nome comprido em coluna estreita: desenha sem erro', async () => {
    const columns = Array.from({ length: 57 }, (_, i) => ({ key: `c${i}`, label: i === 0 ? 'Nº de ordem' : `Coluna ${i}`, type: 'text' }))
    const rows = Array.from({ length: 4 }, () =>
      columns.map((_, i) => (i % 2 ? 'maria.da.conceicao.silva@exemplo.com.br' : 'ADRIANA CRISTINA DA SILVA')))
    const buf = await renderToBuffer(
      <RelatorioJsonDocument data={relatorio(57, 4, { columns, rows })} geradoEm="11/11/2026 10:00" />,
    )
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })
})
