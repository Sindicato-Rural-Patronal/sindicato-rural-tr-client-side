import { describe, it, expect, vi, beforeEach } from 'vitest'

// Os pedidos que o front faz para o Nº dos lançamentos (SR-066): a ordem vai na lista e no CSV,
// e o "próximo Nº" vem de GET /admin/finance/transactions/next-number.
const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args), apiUpload: vi.fn() }))
const saveBlob = vi.fn()
vi.mock('@/utils/download', () => ({ saveBlob: (...args: unknown[]) => saveBlob(...args), openBlob: vi.fn() }))

import { exportFinanceTransactions, fetchFinanceTransactionsForRange } from '@/hooks/useFinance'

const resposta = (corpo: unknown = {}) => ({ ok: true, blob: async () => new Blob(['csv']), json: async () => corpo })

beforeEach(() => {
  apiFetch.mockReset()
  saveBlob.mockReset()
})

describe('CSV dos lançamentos: repassa a ordem da tela', () => {
  it('ordenado por Nº, o pedido leva orderBy=number (junto da busca e sem page/limit)', async () => {
    apiFetch.mockResolvedValue(resposta())
    await exportFinanceTransactions({ page: 3, limit: 20, search: '45', orderBy: 'number' })
    expect(apiFetch).toHaveBeenCalledWith('/admin/finance/transactions/export?search=45&orderBy=number')
    expect(saveBlob).toHaveBeenCalledTimes(1)
  })

  it('na ordem padrão (data) não manda orderBy', async () => {
    apiFetch.mockResolvedValue(resposta())
    await exportFinanceTransactions({ search: '45', orderBy: 'date' })
    expect(apiFetch).toHaveBeenCalledWith('/admin/finance/transactions/export?search=45')
    await exportFinanceTransactions({ orderBy: undefined })
    expect(apiFetch).toHaveBeenLastCalledWith('/admin/finance/transactions/export')
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
