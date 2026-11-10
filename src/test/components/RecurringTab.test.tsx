import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { FinanceRecurrence } from '@/hooks/useFinance'
import type { ReactElement } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

// As ações por linha (RowActions) usam dica, que pede o provedor como no app.
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: TooltipProvider })

// Reativar uma recorrência pausada não lança os meses da pausa (SR-054): a tela
// pede confirmação e explica antes de mandar o PATCH.

let recorrencias: FinanceRecurrence[]
const atualizar = vi.fn()

const ok = <T,>(data: T) => ({ data, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() })

vi.mock('@/hooks/useFinance', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useFinance')>()),
  useFinanceRecurrences: () => ok(recorrencias),
  useFinanceCategories: () => ok([]),
  useFinanceAccounts: () => ok([]),
  useFinancePaymentMethods: () => ok([]),
  useCreateFinancePaymentMethod: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateFinanceRecurrence: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFinanceRecurrence: () => ({ mutateAsync: atualizar, isPending: false }),
  useDeleteFinanceRecurrence: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { RecurringTab } = await import('@/components/financeiro/RecurringTab')

function recorrencia(over: Partial<FinanceRecurrence> = {}): FinanceRecurrence {
  return {
    id: 'r1', type: 'OUT', description: 'ALUGUEL DA SEDE', amountCents: 250000, dayOfMonth: 10,
    startMonth: '2026-01', endMonth: null, lastGeneratedMonth: '2026-07', paymentMethod: null, notes: null,
    active: false, categoryId: null, category: null, accountId: null, account: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const AVISO = 'Os meses em que ela ficou pausada não serão lançados. Ela volta a lançar a partir deste mês.'
const tudo = { enabled: true, canCreate: true, canUpdate: true, canDelete: true }

beforeEach(() => {
  vi.clearAllMocks()
  atualizar.mockResolvedValue({})
  recorrencias = [recorrencia()]
})

describe('RecurringTab: reativar', () => {
  it('pausada: "Reativar" explica que os meses da pausa não serão lançados e só reativa ao confirmar', async () => {
    render(<RecurringTab {...tudo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent(AVISO)
    expect(dialogo).toHaveTextContent('ALUGUEL DA SEDE')
    expect(atualizar).not.toHaveBeenCalled()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reativar' }))
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith({ id: 'r1', body: { active: true } }))
  })

  it('cancelar a confirmação não reativa', () => {
    render(<RecurringTab {...tudo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('ativa: pausar continua direto, sem confirmação', async () => {
    recorrencias = [recorrencia({ active: true })]
    render(<RecurringTab {...tudo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith({ id: 'r1', body: { active: false } }))
  })

  it('no formulário, ligar "Ativa" numa pausada mostra o mesmo aviso', () => {
    render(<RecurringTab {...tudo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Pausada \(não gera\)/ }))
    expect(screen.getByText(AVISO)).toBeInTheDocument()
  })

  it('o texto da aba avisa que mês fechado fica sem o lançamento até ser reaberto', () => {
    render(<RecurringTab {...tudo} />)
    expect(screen.getByText(/Mês fechado no caixa da recorrência fica sem o lançamento/)).toBeInTheDocument()
  })
})
