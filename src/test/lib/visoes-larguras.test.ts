import { describe, it, expect } from 'vitest'
import {
  MINIMO_DA_COLUNA, PISO_DO_TEXTO, RESPIRO, colunaInteira, larguraPedida, largurasDasColunas, palavras,
  type ColunaParaMedir, type Medidor,
} from '@/components/visoes/larguras'
import { textoDaCelula, textoNaTabela } from '@/components/visoes/lancamentos'
import type { FinanceTransaction } from '@/hooks/useFinance'

// A largura das colunas da tabela da visão (decisão 007, SR-150): nada de palavra
// partida no meio, e a Contabilidade (9 colunas) cabendo a 1280 px.

// 8 px por letra: dá para fazer as contas de cabeça.
const medir: Medidor = texto => texto.length * 8
const col = (over: Partial<ColunaParaMedir> = {}): ColunaParaMedir =>
  ({ key: 'x', label: 'X', type: 'text', weight: 2, fonte: 'texto', ...over })

describe('larguraPedida', () => {
  it('texto: a maior palavra (só espaço separa palavras) mais o respiro', () => {
    expect(palavras('Curso/SENAR  de  verão')).toEqual(['Curso/SENAR', 'de', 'verão'])
    expect(larguraPedida(col(), ['Convênios do mês', 'BANCO'], medir)).toBe(9 * 8 + RESPIRO)
  })

  it('valor inteiro: o maior valor inteiro (a data não quebra)', () => {
    expect(larguraPedida(col({ type: 'date' }), ['27/10/2026'], medir)).toBe(80 + RESPIRO)
  })

  it('o rótulo também conta (a maior palavra dele) e há um mínimo', () => {
    expect(larguraPedida(col({ label: 'Observações' }), ['a'], medir)).toBe(11 * 8 + RESPIRO)
    expect(larguraPedida(col({ label: 'Nº' }), ['7'], medir)).toBe(MINIMO_DA_COLUNA)
  })

  it('o ícone ou o ponto entram como `extra`', () => {
    expect(larguraPedida(col({ extra: 16 }), ['Doação'], medir)).toBe(6 * 8 + 16 + RESPIRO)
  })
})

describe('colunaInteira', () => {
  it('pelo tipo do catálogo, ou texto em que todo valor é um número só (CNPJ/CPF)', () => {
    expect(colunaInteira('money', ['1,00'])).toBe(true)
    expect(colunaInteira('text', ['44.555.666/0001-81', '', '—', '123.456.789-09'])).toBe(true)
    expect(colunaInteira('text', ['PIX', 'BOLETO'])).toBe(false)
    expect(colunaInteira('text', ['', '—'])).toBe(false)
  })
})

describe('largurasDasColunas', () => {
  const tipos = [
    { label: 'Nº', type: 'number', weight: 1 },
    { label: 'Descrição', type: 'text', weight: 4 },
    { label: 'Categoria', type: 'text', weight: 2 },
    { label: 'Valor', type: 'money', weight: 1.5 },
  ]

  it('cabe tudo: a sobra vai para as de texto, pelo peso; as inteiras ficam como pediram', () => {
    const r = largurasDasColunas(tipos, [44, 120, 100, 100], 664)
    expect(r.rola).toBe(false)
    expect(r.larguras[0]).toBe(44)
    expect(r.larguras[3]).toBe(100)
    // Sobram 300: 4/6 para a Descrição e 2/6 para a Categoria.
    expect(r.larguras[1]).toBe(320)
    expect(r.larguras[2]).toBe(200)
  })

  it('não cabe: as de texto encolhem (a de mais peso por último) e as inteiras não', () => {
    const r = largurasDasColunas(tipos, [44, 200, 160, 100], 444)
    expect(r.rola).toBe(false)
    expect(r.larguras[0]).toBe(44)
    expect(r.larguras[3]).toBe(100)
    expect(r.larguras[1] + r.larguras[2]).toBeLessThanOrEqual(300)
    expect(r.larguras[1]).toBeGreaterThan(r.larguras[2])
    expect(r.larguras[2]).toBeGreaterThanOrEqual(PISO_DO_TEXTO)
  })

  it('nem os pisos cabem: cada uma com o que pede, e a tabela rola', () => {
    const r = largurasDasColunas(tipos, [44, 200, 160, 100], 250)
    expect(r).toEqual({ larguras: [44, 200, 160, 100], rola: true, total: 504 })
  })

  it('a coluna marcada `inteira` (CNPJ/CPF em texto) também não encolhe', () => {
    const r = largurasDasColunas(
      [{ label: 'CNPJ / CPF', type: 'text', weight: 2, inteira: true }, { label: 'Nome', type: 'text', weight: 3 }],
      [150, 200],
      300,
    )
    expect(r.larguras[0]).toBe(150)
    expect(r.larguras[1]).toBe(150)
  })
})

describe('o texto das células de realce', () => {
  const t = {
    id: '1', number: null, type: 'OUT', amountCents: 123456, date: '2026-10-27T00:00:00.000Z', description: 'Conta',
    category: { name: 'Energia' }, account: null,
  } as unknown as FinanceTransaction

  it('Nº vazio vira "—"; a data e o valor saem do lançamento cru', () => {
    expect(textoDaCelula('number', t, '')).toBe('—')
    expect(textoDaCelula('date', t, 'x')).toBe('27/10/2026')
    expect(textoDaCelula('category', t, 'x')).toBe('Energia')
    expect(textoDaCelula('account', t, 'x')).toBe('')
    // (o Intl separa "R$" do número com espaço que não quebra)
    expect(textoDaCelula('amount', t, '1.234,56').replace(/\s/g, ' ')).toBe('− R$ 1.234,56')
    // Na tabela o cabeçalho já diz "Valor (R$)".
    expect(textoNaTabela('amount', t, '1.234,56')).toBe('− 1.234,56')
  })

  it('as outras colunas: o texto da API (`cells`), como veio', () => {
    expect(textoDaCelula('payeeDocument', t, '44.555.666/0001-81')).toBe('44.555.666/0001-81')
    expect(textoDaCelula('notes', t, undefined)).toBe('')
  })
})
