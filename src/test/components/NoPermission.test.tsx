import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/i18n'

let perm: { isError: boolean; retry: () => void; retrying: boolean }
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => perm }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/admin/ajuda">{children}</a>,
}))

const { NoPermission } = await import('@/components/NoPermission')

beforeEach(() => {
  perm = { isError: false, retry: vi.fn(), retrying: false }
})

describe('NoPermission', () => {
  it('sem permissão de verdade: o aviso e o link da ajuda', () => {
    render(<NoPermission message="Você não tem permissão para ver o Financeiro." />)
    expect(screen.getByText('Você não tem permissão para ver o Financeiro.')).toBeInTheDocument()
    expect(screen.getByText('Por que não vejo esta tela?')).toBeInTheDocument()
  })

  it('permissões que não carregaram não viram "sem permissão"', () => {
    perm.isError = true
    render(<NoPermission message="Você não tem permissão para ver o Financeiro." />)
    expect(screen.queryByText(/não tem permissão/)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível conferir suas permissões.')
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(perm.retry).toHaveBeenCalledTimes(1)
  })
})
