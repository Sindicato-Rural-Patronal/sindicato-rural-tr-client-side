import { describe, it, expect, vi, beforeEach } from 'vitest'

// Os pedidos que o front faz para o Nº dos lançamentos (SR-066): a ordem vai na lista e na
// exportação (SR-103: o `ExportMenu` da fonte `finance-transactions`), e o "próximo Nº" vem de
// GET /admin/finance/transactions/next-number.
const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args), apiUpload: vi.fn() }))
vi.mock('@/utils/download', () => ({ saveBlob: vi.fn(), openBlob: vi.fn() }))

import { financeExportFilters, fetchFinanceTransactionsForRange } from '@/hooks/useFinance'

const resposta = (corpo: unknown = {}) => ({ ok: true, blob: async () => new Blob(['csv']), json: async () => corpo })

beforeEach(() => {
  apiFetch.mockReset()
})

describe('exportação dos lançamentos: os filtros e a ordem da tela', () => {
  it('ordenado por Nº, leva orderBy=number, junto dos filtros e sem page/limit', () => {
    expect(financeExportFilters({
      page: 3, limit: 20, from: '2026-10-01', to: '2026-10-31', type: 'OUT', categoryId: 'c1', accountId: 'a1',
      method: 'PIX', search: '45', orderBy: 'number',
    })).toEqual({
      from: '2026-10-01', to: '2026-10-31', type: 'OUT', categoryId: 'c1', accountId: 'a1', method: 'PIX', search: '45',
      orderBy: 'number',
    })
  })

  it('na ordem padrão (data) não manda orderBy; filtro vazio não vai', () => {
    const f = financeExportFilters({ search: '45', orderBy: 'date', type: '' })
    expect(f.orderBy).toBeUndefined()
    expect(f.type).toBeUndefined()
    expect(Object.entries(f).filter(([, v]) => v !== undefined)).toEqual([['search', '45']])
  })

  it('as chaves vão na ordem em que a API diz os filtros no PDF', () => {
    expect(Object.keys(financeExportFilters({}))).toEqual(
      ['from', 'to', 'type', 'categoryId', 'accountId', 'method', 'search', 'orderBy'],
    )
  })
})

describe('relatório de despesas: busca o período inteiro na ordem padrão', () => {
  it('não manda orderBy (o relatório ordena por data e Nº sozinho)', async () => {
    apiFetch.mockResolvedValue(resposta({ data: [], totalPages: 1 }))
    await fetchFinanceTransactionsForRange({ from: '2026-10-01', to: '2026-10-31' })
    const url = String(apiFetch.mock.calls[0][0])
    expect(url).toContain('from=2026-10-01')
    expect(url).not.toContain('orderBy')
  })
})
