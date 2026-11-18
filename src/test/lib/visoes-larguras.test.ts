import { describe, it, expect } from 'vitest'
import {
  MINIMO_DA_COLUNA, RESPIRO, TETO_DA_PALAVRA, colunaInteira, larguraDoRotulo, larguraPedida, largurasDasColunas, palavras,
  type ColunaParaMedir, type Medidor,
} from '@/components/visoes/larguras'
import { textoDaCelula, textoNaTabela } from '@/components/visoes/lancamentos'
import type { FinanceTransaction } from '@/hooks/useFinance'

// A largura das colunas da tabela da visão (decisão 007, SR-150; SR-153): nenhuma
// palavra cortada, nem no cabeçalho; se os pisos não cabem, a tabela rola.

// 8 px por letra: dá para fazer as contas de cabeça.
const medir: Medidor = texto => texto.length * 8
/** O px de folga sobre a medida do canvas. */
const FOLGA = 1
const col = (over: Partial<ColunaParaMedir> = {}): ColunaParaMedir =>
  ({ key: 'x', label: 'X', type: 'text', weight: 2, fonte: 'texto', ...over })

describe('larguraPedida', () => {
  it('texto: a maior palavra (só espaço separa palavras) mais o respiro', () => {
    expect(palavras('Curso/SENAR  de  verão')).toEqual(['Curso/SENAR', 'de', 'verão'])
    expect(larguraPedida(col(), ['Convênios do mês', 'BANCO'], medir)).toBe(9 * 8 + FOLGA + RESPIRO)
  })

  it('valor inteiro: o maior valor inteiro (a data não quebra)', () => {
    expect(larguraPedida(col({ type: 'date' }), ['27/10/2026'], medir)).toBe(80 + FOLGA + RESPIRO)
  })

  it('o rótulo também conta (inteiro em até duas linhas) e há um mínimo', () => {
    expect(larguraPedida(col({ label: 'Observações' }), ['a'], medir)).toBe(11 * 8 + FOLGA + RESPIRO)
    expect(larguraPedida(col({ label: 'Nº' }), ['7'], medir)).toBe(MINIMO_DA_COLUNA)
    // "Nome / Razão" | "social": 12 letras na linha maior (a 72 px, "Nome / Razão…" saía cortado).
    expect(larguraDoRotulo('Nome / Razão social', medir)).toBe(12 * 8)
    expect(larguraPedida(col({ label: 'Nome / Razão social' }), ['ANA'], medir)).toBe(12 * 8 + FOLGA + RESPIRO)
  })

  it('o ícone ou o ponto entram como `extra`', () => {
    expect(larguraPedida(col({ extra: 16 }), ['Doação'], medir)).toBe(6 * 8 + 16 + FOLGA + RESPIRO)
  })

  it('o piso próprio da coluna (Descrição, Nome) vale mesmo com palavras curtas', () => {
    expect(larguraPedida(col({ piso: 180 }), ['Taxa de uso'], medir)).toBe(180)
    expect(larguraPedida(col({ piso: 180 }), ['Palavraenormesemespaconenhum'], medir)).toBe(28 * 8 + FOLGA + RESPIRO)
  })

  it('só um "token" muito longo (e-mail, URL) passa do teto e leva reticências', () => {
    const email = 'financeiro.cooperativa.agricola@exemplo.com.br'
    expect(larguraPedida(col(), [email], medir)).toBe(TETO_DA_PALAVRA + FOLGA + RESPIRO)
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

  it('não cabe: nenhuma coluna encolhe abaixo do piso (isso cortava palavras); a tabela rola', () => {
    // Faltam 60 px: antes as de texto encolhiam até 72 px e a palavra ganhava reticências.
    expect(largurasDasColunas(tipos, [44, 200, 160, 100], 444)).toEqual({ larguras: [44, 200, 160, 100], rola: true, total: 504 })
    expect(largurasDasColunas(tipos, [44, 200, 160, 100], 250)).toEqual({ larguras: [44, 200, 160, 100], rola: true, total: 504 })
    // Na conta exata, cabe.
    expect(largurasDasColunas(tipos, [44, 200, 160, 100], 504).rola).toBe(false)
  })

  it('a coluna marcada `inteira` (CNPJ/CPF em texto) não recebe a sobra', () => {
    const r = largurasDasColunas(
      [{ type: 'text', weight: 2, inteira: true }, { type: 'text', weight: 3 }],
      [150, 200],
      400,
    )
    expect(r.larguras).toEqual([150, 250])
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
