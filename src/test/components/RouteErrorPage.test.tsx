import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@/i18n'

vi.mock('@/components/NoPermission', () => ({ NoPermission: () => <p>AVISO SEM PERMISSÃO</p> }))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate: vi.fn() }), redirect: vi.fn() }))
vi.mock('@/lib/auth-guard', () => {
  class NoPermissionError extends Error {}
  return { NoPermissionError }
})

const { RouteErrorPage } = await import('@/components/RouteErrorPage')
const { NoPermissionError } = await import('@/lib/auth-guard')

describe('RouteErrorPage', () => {
  it('sem permissão: mostra o NoPermission', () => {
    render(<RouteErrorPage error={new NoPermissionError('x')} reset={() => {}} info={undefined} />)
    expect(screen.getByText('AVISO SEM PERMISSÃO')).toBeInTheDocument()
  })

  it('outro erro: tela de erro com "Tentar de novo"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<RouteErrorPage error={new Error('x')} reset={() => {}} info={undefined} />)
    expect(screen.queryByText('AVISO SEM PERMISSÃO')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument()
  })
})
