import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'

// "Adicionar instrutor" da janela do curso: GET /admin/instructors exige READ_USER. Sem a
// permissão a lista nem é pedida (eram 3 pedidos com 403 ao abrir Cursos, SR-126) e a dica
// toma o lugar do formulário.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let perms: string[]
let loading: boolean
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: (p: string) => !loading && perms.includes(p), isLoading: loading }),
}))

const { AddInstructorForm } = await import('@/components/courses/AddInstructorForm')

function renderForm(assigned: string[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AddInstructorForm courseId="c1" assignedUserDataIds={assigned} />
    </QueryClientProvider>,
  )
}

const instrutores = [
  { id: 'i1', userData: { id: 'u1', name: 'ANA' } },
  { id: 'i2', userData: { id: 'u2', name: 'BRUNO' } },
]

beforeEach(() => {
  vi.clearAllMocks()
  loading = false
  perms = ['UPDATE_COURSE', 'READ_USER']
  apiFetch.mockResolvedValue({ json: () => Promise.resolve(instrutores) })
})

describe('AddInstructorForm', () => {
  it('sem "Visualizar usuários": não pede a lista e diz do que a escolha precisa', async () => {
    perms = ['UPDATE_COURSE']
    renderForm()
    expect(screen.getByText('Pede a permissão Visualizar usuários')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument()
    await new Promise(r => setTimeout(r, 30))
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('com a permissão: pede a lista uma vez e some quem já está no curso', async () => {
    renderForm(['u1'])
    await waitFor(() => expect(screen.getByRole('option', { name: 'BRUNO' })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: 'ANA' })).not.toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch.mock.calls[0][0]).toBe('/admin/instructors')
    expect(screen.queryByText('Pede a permissão Visualizar usuários')).not.toBeInTheDocument()
  })

  it('enquanto as permissões carregam, não pede nada', async () => {
    loading = true
    renderForm()
    await new Promise(r => setTimeout(r, 30))
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
