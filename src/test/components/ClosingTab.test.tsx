import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { FinanceAccount, FinanceClosing, FinanceClosingPreview } from '@/hooks/useFinance'

type Q<T> = { data?: T; isLoading: boolean; isError: boolean; isFetching: boolean; error?: unknown }
const ok = <T,>(data: T): Q<T> => ({ data, isLoading: false, isError: false, isFetching: false })
const falhou: Q<never> = { data: undefined, isLoading: false, isError: true, isFetching: false }

let contas: Q<FinanceAccount[]>
let previa: Q<FinanceClosingPreview>
let historico: Q<FinanceClosing[]>
const recarregar = vi.fn()
const fechar = vi.fn()
const reabrir = vi.fn()

vi.mock('@/hooks/useFinance', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useFinance')>()),
  useFinanceAccounts: () => ({ ...contas, refetch: recarregar }),
  useFinanceClosingPreview: () => ({ ...previa, refetch: recarregar }),
  useFinanceClosings: () => ({ ...historico, refetch: recarregar }),
  useCreateFinanceClosing: () => ({ mutateAsync: fechar, isPending: false }),
  useDeleteFinanceClosing: () => ({ mutateAsync: reabrir, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { ClosingTab } = await import('@/components/financeiro/ClosingTab')

const CAIXA: FinanceAccount = {
  id: 'c1', name: 'BANCO', color: '#000', active: true, order: 0, isDeleted: false,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const PREVIA: FinanceClosingPreview = {
  openingCents: 100000, inCents: 50000, outCents: 20000, expectedBalanceCents: 130000, differenceCents: 0, closing: null,
}
const FECHAMENTO: FinanceClosing = {
  id: 'f1', accountId: 'c1', month: '2026-10', expectedBalanceCents: 130000, countedBalanceCents: 130000,
  differenceCents: 0, notes: null, closedAt: '2026-10-31T20:00:00.000Z', closedByAdminId: 'a1',
}
const TEXTO_REABRIR =
  'Reabrir 10/2026 no caixa BANCO libera criar, editar e excluir os lançamentos desse mês. A reabertura fica registrada na auditoria.'

beforeEach(() => {
  vi.clearAllMocks()
  reabrir.mockResolvedValue({})
  contas = ok([CAIXA])
  previa = ok(PREVIA)
  historico = ok([])
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

  it('prévia recusada pela API (400): mostra o motivo dela, não o texto genérico', async () => {
    const { ApiError } = await import('@/lib/api')
    const motivo = 'Mês inválido (use AAAA-MM, com ano entre 1900 e 2999)'
    previa = { ...falhou, error: new ApiError(400, motivo) }
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.getByRole('alert')).toHaveTextContent(motivo)
  })

  it('caixas que não carregaram não viram "Nenhum caixa cadastrado"', () => {
    contas = falhou
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.queryByText('Nenhum caixa cadastrado')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os caixas.')
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(recarregar).toHaveBeenCalled()
  })

  it('explica que o mês fechado trava os lançamentos do caixa', () => {
    render(<ClosingTab enabled canCreate canDelete />)
    expect(screen.getByText(/Com o mês fechado, os lançamentos desse caixa com data no mês não podem ser/))
      .toHaveTextContent('criados, editados nem excluídos')
  })
})

describe('ClosingTab: reabrir mês', () => {
  it('no histórico: "Reabrir mês" pede confirmação com o mês, o caixa e a auditoria, e só então reabre', async () => {
    historico = ok([FECHAMENTO])
    render(<ClosingTab enabled canCreate canDelete />)
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir mês 10/2026' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent(TEXTO_REABRIR)
    expect(reabrir).not.toHaveBeenCalled()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir mês' }))
    await waitFor(() => expect(reabrir).toHaveBeenCalledWith('f1'))
  })

  it('no mês já fechado escolhido em cima: botão "Reabrir mês" com a mesma confirmação', () => {
    previa = ok({ ...PREVIA, closing: FECHAMENTO })
    render(<ClosingTab enabled canCreate canDelete />)
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir mês' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent(TEXTO_REABRIR)
  })

  it('sem DELETE_FINANCE, não aparece "Reabrir mês" em lugar nenhum', () => {
    historico = ok([FECHAMENTO])
    previa = ok({ ...PREVIA, closing: FECHAMENTO })
    render(<ClosingTab enabled canCreate canDelete={false} />)
    expect(screen.queryByRole('button', { name: /Reabrir/ })).not.toBeInTheDocument()
  })
})
