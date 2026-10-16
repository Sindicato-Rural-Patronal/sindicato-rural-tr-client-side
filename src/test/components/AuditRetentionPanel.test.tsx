import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

type Settings = { retentionDays: number; options: number[]; oldestAt: string | null; total: number }
let state: { data?: Settings; isLoading: boolean; isError: boolean; isFetching: boolean }
const refetch = vi.fn()
const update = vi.fn()

vi.mock('@/hooks/useAuditTrail', () => ({
  useAuditSettings: () => ({ ...state, refetch }),
  useUpdateAuditRetention: () => ({ mutateAsync: update, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { AuditRetentionPanel } = await import('@/components/auditoria/AuditRetentionPanel')

beforeEach(() => {
  vi.clearAllMocks()
  state = {
    data: { retentionDays: 365, options: [90, 180, 365, 730, 0], oldestAt: '2026-01-02T12:00:00.000Z', total: 42 },
    isLoading: false, isError: false, isFetching: false,
  }
})

const abrir = () => fireEvent.click(screen.getByRole('button', { name: /Configurações da trilha/ }))

describe('AuditRetentionPanel', () => {
  it('com o ajuste carregado: mostra a guarda atual e o select', () => {
    render(<AuditRetentionPanel />)
    expect(screen.getByText(/Guarda: 1 ano/)).toBeInTheDocument()
    abrir()
    expect(screen.getByLabelText('Tempo de guarda dos registros')).toHaveValue('365')
  })

  it('ajuste que não carregou: nada de "Guardar para sempre" nem select para escolher', () => {
    state = { data: undefined, isLoading: false, isError: true, isFetching: false }
    render(<AuditRetentionPanel />)
    expect(screen.queryByText(/Guarda:/)).not.toBeInTheDocument()
    abrir()
    expect(screen.queryByLabelText('Tempo de guarda dos registros')).not.toBeInTheDocument()
    expect(screen.queryByText('Nenhum registro na trilha ainda.')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o tempo de guarda atual.')
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
  })
})
