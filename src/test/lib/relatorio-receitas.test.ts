import { describe, it, expect } from 'vitest'
import {
  SEM_CATEGORIA, blocosDeReceitas, nomeDoArquivoReceitas, receitasDoRelatorio, totalDeReceitas,
} from '@/lib/relatorio-receitas'
import type { FinanceTransaction } from '@/hooks/useFinance'

function lanc(over: Partial<FinanceTransaction> = {}): FinanceTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    number: null,
    type: 'IN',
    amountCents: 10000,
    date: '2026-11-01',
    description: 'RECEITA',
    method: null,
    notes: null,
    categoryId: null,
    category: null,
    accountId: null,
    account: null,
    transferId: null,
    recurringId: null,
    recurringMonth: null,
    empenho: null,
    attachments: [],
    createdBy: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  } as FinanceTransaction
}

const cat = (id: string, name: string) =>
  ({ id, name, type: 'IN', color: '#000', active: true, order: 0 }) as FinanceTransaction['category']
const comCat = (id: string, name: string, over: Partial<FinanceTransaction> = {}) =>
  lanc({ categoryId: id, category: cat(id, name), ...over })

describe('receitasDoRelatorio', () => {
  it('só entradas: sem saída, sem "só nota" e sem transferência entre caixas', () => {
    const entrada = lanc({ id: 'a' })
    const saida = lanc({ id: 'b', type: 'OUT' })
    const soNota = lanc({ id: 'c', type: null })
    const pernaDeTransferencia = lanc({ id: 'd', transferId: 't1' })
    expect(receitasDoRelatorio([entrada, saida, soNota, pernaDeTransferencia]).map(t => t.id)).toEqual(['a'])
  })
})

describe('blocosDeReceitas', () => {
  it('agrupa por categoria, na ordem do nome, com "Sem categoria" por último', () => {
    const blocos = blocosDeReceitas([
      lanc({ id: 'sem' }),
      comCat('z', 'MENSALIDADES'),
      comCat('a', 'ALUGUEL'),
      comCat('a', 'ALUGUEL'),
      comCat('e', 'Ébano'),
    ])
    expect(blocos.map(b => b.label)).toEqual(['ALUGUEL', 'Ébano', 'MENSALIDADES', SEM_CATEGORIA])
    expect(blocos.map(b => b.linhas.length)).toEqual([2, 1, 1, 1])
  })

  it('categoria sem entrada no período não vira bloco', () => {
    expect(blocosDeReceitas([comCat('a', 'ALUGUEL', { type: 'OUT' })])).toEqual([])
    expect(blocosDeReceitas([])).toEqual([])
  })

  it('subtotal por categoria e total geral somam centavos inteiros', () => {
    const blocos = blocosDeReceitas([
      comCat('a', 'ALUGUEL', { amountCents: 10 }),
      comCat('a', 'ALUGUEL', { amountCents: 20 }),
      comCat('m', 'MENSALIDADES', { amountCents: 123456 }),
      lanc({ amountCents: 5 }),
      comCat('m', 'MENSALIDADES', { type: 'OUT', amountCents: 999999 }),
      lanc({ amountCents: 777, transferId: 't' }),
    ])
    expect(blocos.map(b => b.totalCents)).toEqual([30, 123456, 5])
    expect(totalDeReceitas(blocos)).toBe(123491)
    expect(totalDeReceitas([])).toBe(0)
  })

  it('ordena por data e, no mesmo dia, pelo Nº (9 antes de 10; sem Nº por último)', () => {
    const [bloco] = blocosDeReceitas([
      comCat('a', 'ALUGUEL', { id: 'semnum', date: '2026-11-02', number: null }),
      comCat('a', 'ALUGUEL', { id: 'n10', date: '2026-11-02', number: 10 }),
      comCat('a', 'ALUGUEL', { id: 'n9', date: '2026-11-02', number: 9 }),
      comCat('a', 'ALUGUEL', { id: 'antes', date: '2026-11-01', number: 99 }),
    ])
    expect(bloco.linhas.map(l => l.id)).toEqual(['antes', 'n9', 'n10', 'semnum'])
  })

  it('a linha traz Nº, nome de quem pagou, documento formatado, descrição e forma', () => {
    const [bloco] = blocosDeReceitas([
      comCat('a', 'ALUGUEL', {
        number: 128, description: 'ALUGUEL DO AUDITÓRIO', method: ' PIX ',
        empenho: { razaoSocial: ' COOP LTDA ', cnpjCpf: '77419505000110' },
      }),
      comCat('a', 'ALUGUEL', {
        date: '2026-11-03', empenho: { nomeFantasia: 'JOÃO', cnpjCpf: '12345678900' },
      }),
      comCat('a', 'ALUGUEL', {
        date: '2026-11-04', empenho: { cnpjCpf: '123' },
      }),
      comCat('a', 'ALUGUEL', { date: '2026-11-05' }),
    ])
    expect(bloco.linhas[0]).toMatchObject({
      numero: '128', nome: 'COOP LTDA', documento: '77.419.505/0001-10',
      descricao: 'ALUGUEL DO AUDITÓRIO', forma: 'PIX', amountCents: 10000,
    })
    expect(bloco.linhas[1]).toMatchObject({ numero: '—', nome: 'JOÃO', documento: '123.456.789-00', forma: '' })
    // Documento fora do tamanho vai como foi digitado, como no recibo.
    expect(bloco.linhas[2]).toMatchObject({ nome: '', documento: '123' })
    // Sem nota: nome e documento vazios (nunca cai na descrição).
    expect(bloco.linhas[3]).toMatchObject({ nome: '', documento: '' })
  })
})

describe('nomeDoArquivoReceitas', () => {
  it('segue o padrão do relatório de despesas', () => {
    expect(nomeDoArquivoReceitas('2026-11-01', '2026-11-30')).toBe('receitas-2026-11-01-a-2026-11-30.pdf')
  })
})
