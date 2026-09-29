import { describe, it, expect } from 'vitest'
import {
  blocosDoRelatorio, despesasDoRelatorio, grupoDoLancamento, nomeDoLancamento,
  situacaoDoLancamento, totalDoRelatorio,
} from '@/lib/relatorio-empenho'
import type { FinanceTransaction } from '@/hooks/useFinance'

/** Lançamento mínimo: o relatório só olha alguns campos. */
function lanc(over: Partial<FinanceTransaction> = {}): FinanceTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'OUT',
    amountCents: 10000,
    date: '2026-09-01',
    description: 'DESPESA',
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
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  } as FinanceTransaction
}

const categoria = (name: string) =>
  ({ id: 'c', name, type: 'OUT', color: '#000', active: true, order: 0 }) as FinanceTransaction['category']

describe('grupoDoLancamento', () => {
  it('documento de 14 dígitos é pessoa jurídica; de 11, física', () => {
    expect(grupoDoLancamento(lanc({ empenho: { cnpjCpf: '77.419.505/0001-10' } }))).toBe('juridica')
    expect(grupoDoLancamento(lanc({ empenho: { cnpjCpf: '123.456.789-00' } }))).toBe('fisica')
  })

  it('empresa vinculada na nota vale mesmo sem CNPJ digitado', () => {
    expect(grupoDoLancamento(lanc({ empenho: { empresaId: 'abc' } }))).toBe('juridica')
  })

  it('sem nota nenhuma cai em pessoa física', () => {
    // É o caso da despesa lançada direto no caixa, sem nota de empenho.
    expect(grupoDoLancamento(lanc())).toBe('fisica')
  })

  it('imposto vai para TRIBUTOS mesmo sendo pago a uma empresa', () => {
    // É assim que o relatório antigo separa FGTS e INSS: o tipo manda mais que
    // o documento de quem recebe.
    const inss = lanc({ category: categoria('Impostos/Taxas'), empenho: { cnpjCpf: '77.419.505/0001-10' } })
    expect(grupoDoLancamento(inss)).toBe('tributos')
  })

  it('reconhece o tributo pelo nome da categoria, sem acento nem maiúscula', () => {
    for (const nome of ['Impostos/Taxas', 'tributos', 'GUIA INSS', 'Taxa municipal']) {
      expect(grupoDoLancamento(lanc({ category: categoria(nome) })), nome).toBe('tributos')
    }
  })

  it('tarifa de banco vai para DESPESAS BANCÁRIAS', () => {
    expect(grupoDoLancamento(lanc({ category: categoria('Tarifas bancárias') }))).toBe('bancarias')
  })
})

describe('nomeDoLancamento', () => {
  it('usa o fornecedor da nota', () => {
    expect(nomeDoLancamento(lanc({ empenho: { razaoSocial: 'SANEPAR' } }))).toBe('SANEPAR')
  })

  it('sem razão social, usa o nome fantasia', () => {
    expect(nomeDoLancamento(lanc({ empenho: { nomeFantasia: 'MERCADO CENTRAL' } }))).toBe('MERCADO CENTRAL')
  })

  it('sem nota, usa a descrição do lançamento', () => {
    expect(nomeDoLancamento(lanc({ description: 'COMPRA DE MATERIAL' }))).toBe('COMPRA DE MATERIAL')
  })
})

describe('situacaoDoLancamento', () => {
  it('sem forma de pagamento informada, a despesa está EM ABERTO', () => {
    expect(situacaoDoLancamento(lanc({ method: null }))).toBe('EM ABERTO')
    expect(situacaoDoLancamento(lanc({ method: '  ' }))).toBe('EM ABERTO')
  })

  it('com forma informada, mostra a forma', () => {
    expect(situacaoDoLancamento(lanc({ method: 'Débito automático' }))).toBe('DÉBITO AUTOMÁTICO')
  })
})

describe('despesasDoRelatorio', () => {
  it('leva saídas e "só nota"; entrada fica de fora', () => {
    const lista = [lanc({ type: 'OUT' }), lanc({ type: null }), lanc({ type: 'IN' })]
    expect(despesasDoRelatorio(lista)).toHaveLength(2)
  })

  it('transferência entre caixas não entra', () => {
    // Ela só move dinheiro de um caixa para outro: contar dobraria o total.
    expect(despesasDoRelatorio([lanc({ transferId: 't1' })])).toHaveLength(0)
  })
})

describe('blocosDoRelatorio', () => {
  const lista = [
    lanc({ amountCents: 33735, date: '2026-09-01', empenho: { numero: '3120', razaoSocial: 'JEAN NASSIF', cnpjCpf: '123.456.789-00' } }),
    lanc({ amountCents: 23000, date: '2026-09-01', empenho: { numero: '3117', razaoSocial: 'GAS DOIS IRMÃOS', cnpjCpf: '11.222.333/0001-44' } }),
    lanc({ amountCents: 90077, date: '2026-09-01', category: categoria('Impostos/Taxas'), empenho: { numero: '3133', razaoSocial: 'CAIXA (FGTS)' } }),
  ]

  it('devolve sempre os quatro blocos, na ordem do relatório antigo', () => {
    expect(blocosDoRelatorio(lista).map(b => b.grupo)).toEqual(['fisica', 'juridica', 'tributos', 'bancarias'])
  })

  it('bloco sem despesa continua aparecendo, com total zero', () => {
    // "DESPESAS BANCÁRIAS R$ 0,00" é informação; sumir seria pior.
    const bancarias = blocosDoRelatorio(lista).find(b => b.grupo === 'bancarias')!
    expect(bancarias.linhas).toEqual([])
    expect(bancarias.totalCents).toBe(0)
  })

  it('cada bloco soma o próprio total', () => {
    const blocos = blocosDoRelatorio(lista)
    expect(blocos.find(b => b.grupo === 'fisica')!.totalCents).toBe(33735)
    expect(blocos.find(b => b.grupo === 'juridica')!.totalCents).toBe(23000)
    expect(blocos.find(b => b.grupo === 'tributos')!.totalCents).toBe(90077)
  })

  it('o total geral é a soma dos quatro', () => {
    expect(totalDoRelatorio(blocosDoRelatorio(lista))).toBe(33735 + 23000 + 90077)
  })

  it('ordena por data e, no mesmo dia, pelo número do empenho', () => {
    const mesmoDia = [
      lanc({ date: '2026-09-04', empenho: { numero: '3148', cnpjCpf: '1' } }),
      lanc({ date: '2026-09-01', empenho: { numero: '3141', cnpjCpf: '1' } }),
      lanc({ date: '2026-09-01', empenho: { numero: '3120', cnpjCpf: '1' } }),
    ]
    const fisica = blocosDoRelatorio(mesmoDia).find(b => b.grupo === 'fisica')!
    expect(fisica.linhas.map(l => l.numero)).toEqual(['3120', '3141', '3148'])
  })

  it('despesa sem nota mostra travessão no lugar do número', () => {
    const semNota = blocosDoRelatorio([lanc({ description: 'SEM NOTA' })])
    expect(semNota.find(b => b.grupo === 'fisica')!.linhas[0].numero).toBe('—')
  })
})
