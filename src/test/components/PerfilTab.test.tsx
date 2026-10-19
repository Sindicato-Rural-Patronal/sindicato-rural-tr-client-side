import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AdminMe } from '@/hooks/useAdmin'
import { ApiError } from '@/lib/api'
import '@/i18n'

// O PATCH /admin/me só troca a senha com a senha atual junto; sem ela, ou com
// ela errada, responde 400 e não grava nada.
const updateMe = vi.fn()
let meState: { data?: AdminMe; isLoading: boolean; isError: boolean; isFetching: boolean }
const refetch = vi.fn()

vi.mock('@/hooks/useAdmin', () => ({
  useMe: () => ({ ...meState, refetch }),
  useUpdateMe: () => ({ mutateAsync: updateMe, isPending: false }),
  useUploadMyAvatar: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const { PerfilTab } = await import('@/components/conta/PerfilTab')

const ME: AdminMe = {
  userId: 'a1',
  userDataId: 'u1',
  username: 'maria',
  name: 'MARIA DA SILVA',
  avatar: null,
  rulesId: 'r1',
  ruleName: 'Administrador',
  permissions: [],
  dashboardPrefs: null,
} as AdminMe

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

beforeEach(() => {
  vi.clearAllMocks()
  updateMe.mockResolvedValue(undefined)
  meState = { data: ME, isLoading: false, isError: false, isFetching: false }
})

describe('Minha conta: trocar a senha', () => {
  it('sem a senha atual não envia e explica no campo', () => {
    render(<PerfilTab />)
    type('Nova senha', 'senha-nova-123')
    type('Confirmar nova senha', 'senha-nova-123')
    salvar()

    expect(updateMe).not.toHaveBeenCalled()
    expect(screen.getByText('Informe a senha atual para trocar a senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha atual')).toHaveFocus()
  })

  it('com a senha atual, manda as duas juntas', async () => {
    render(<PerfilTab />)
    type('Senha atual', 'senha-velha')
    type('Nova senha', 'senha-nova-123')
    type('Confirmar nova senha', 'senha-nova-123')
    salvar()

    await waitFor(() => expect(updateMe).toHaveBeenCalledTimes(1))
    expect(updateMe).toHaveBeenCalledWith({ password: 'senha-nova-123', currentPassword: 'senha-velha' })
    // Depois de trocar, os três campos de senha voltam vazios.
    await waitFor(() => expect(screen.getByLabelText('Senha atual')).toHaveValue(''))
    expect(screen.getByLabelText('Nova senha')).toHaveValue('')
  })

  it('senha atual errada (400 do backend) aparece embaixo do campo', async () => {
    updateMe.mockRejectedValue(new ApiError(400, 'Senha atual incorreta.'))
    render(<PerfilTab />)
    type('Senha atual', 'errada')
    type('Nova senha', 'senha-nova-123')
    type('Confirmar nova senha', 'senha-nova-123')
    salvar()

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('aria-invalid', 'true')
  })

  it('senha nova com menos de 8 caracteres não é enviada', () => {
    render(<PerfilTab />)
    type('Senha atual', 'senha-velha')
    type('Nova senha', 'curta')
    type('Confirmar nova senha', 'curta')
    salvar()

    expect(updateMe).not.toHaveBeenCalled()
    expect(screen.getByText('A senha nova precisa ter pelo menos 8 caracteres.')).toBeInTheDocument()
  })

  it('trocar só o nome não pede a senha atual', async () => {
    render(<PerfilTab />)
    type('Nome', 'MARIA SOUZA')
    salvar()

    await waitFor(() => expect(updateMe).toHaveBeenCalledWith({ name: 'MARIA SOUZA' }))
  })

  it('falha ao carregar os dados: aviso com "Tentar de novo", sem formulário', () => {
    meState = { data: undefined, isLoading: false, isError: true, isFetching: false }
    render(<PerfilTab />)

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os seus dados.')
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
