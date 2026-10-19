import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FinanceAccount, FinanceClosingPreview } from '@/hooks/useFinance'

type Q<T> = { data?: T; isLoading: boolean; isError: boolean; isFetching: boolean }
const ok = <T,>(data: T): Q<T> => ({ data, isLoading: false, isError: false, isFetching: false })
const falhou: Q<never> = { data: undefined, isLoading: false, isError: true, isFetching: false }

let contas: Q<FinanceAccount[]>
let previa: Q<FinanceClosingPreview>
const recarregar = vi.fn()
const fechar = vi.fn()

vi.mock('@/hooks/useFinance', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useFinance')>()),
  useFinanceAccounts: () => ({ ...contas, refetch: recarregar }),
  useFinanceClosingPreview: () => ({ ...previa, refetch: recarregar }),
  useFinanceClosings: () => ({ ...ok([]), refetch: recarregar }),
  useCreateFinanceClosing: () => ({ mutateAsync: fechar, isPending: false }),
  useDeleteFinanceClosing: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { ClosingTab } = await import('@/components/financeiro/ClosingTab')

const CAIXA: FinanceAccount = {
  id: 'c1', name: 'CAIXA', color: '#000', active: true, order: 0, isDeleted: false,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const PREVIA: FinanceClosingPreview = {
  openingCents: 100000, inCents: 50000, outCents: 20000, expectedBalanceCents: 130000, differenceCents: 0, closing: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  contas = ok([CAIXA])
  previa = ok(PREVIA)
})

describe('ClosingTab (fechamento do mês)', () => {
  it('com a prévia: mostra o saldo esperado e deixa fechar', () => {
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.getByText('R$ 1.300,00')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Saldo contado *'), { target: { value: '130000' } })
    expect(screen.getByRole('button', { name: /Fechar mês/ })).toBeEnabled()
  })

  it('prévia que falhou: nada de R$ 0,00, aviso com "Tentar de novo" e sem fechar', () => {
    previa = falhou
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.queryByText('Saldo esperado')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível calcular o saldo esperado deste mês.')
    fireEvent.change(screen.getByLabelText('Saldo contado *'), { target: { value: '130000' } })
    expect(screen.getByRole('button', { name: /Fechar mês/ })).toBeDisabled()
  })

  it('caixas que não carregaram não viram "Nenhum caixa cadastrado"', () => {
    contas = falhou
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.queryByText('Nenhum caixa cadastrado')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os caixas.')
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(recarregar).toHaveBeenCalled()
  })
})
