import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { UnimedDetail } from '@/hooks/useUnimed'
import '@/i18n'

// Hooks simulados: o detalhe de cada beneficiário vem de `detalhes[id]`, e as
// gravações ficam em `updateUnimed` / `createUnimed` para conferir o que iria
// para a API.
type DetailState = { data?: UnimedDetail; isError: boolean; isFetching: boolean }
let detalhes: Record<string, DetailState> = {}
const refetch = vi.fn()
const updateUnimed = vi.fn().mockResolvedValue(undefined)
const createUnimed = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useUnimed', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useUnimed')>()),
  useUnimed: (id: string | null) => ({
    ...(id ? detalhes[id] : undefined) ?? { data: undefined, isError: false, isFetching: false },
    refetch,
  }),
  useUpdateUnimed: () => ({ mutateAsync: updateUnimed, isPending: false }),
  useCreateUnimed: () => ({ mutateAsync: createUnimed, isPending: false }),
}))
vi.mock('@/hooks/useAdmin', () => ({ useAdminUser: () => ({ data: undefined }) }))
vi.mock('@/components/PersonPicker', () => ({ PersonPicker: () => <input aria-label="Buscar pessoa" /> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { UnimedFormDialog } = await import('@/components/unimed/UnimedFormDialog')

function beneficiario(id: string, over: Partial<UnimedDetail> = {}): UnimedDetail {
  return {
    id,
    userDataId: `p-${id}`,
    userData: { id: `p-${id}`, name: `PESSOA ${id}`, cpf: '11144477735' },
    dataAdesao: '2026-03-26',
    tipoMovimento: null,
    tipoDependente: 'NORMAL',
    grauDependencia: 'TITULAR',
    cns: null,
    nomeMae: 'MAE DA PESSOA',
    profissao: 'AGRICULTOR',
    plano: 'UNIMED NACIONAL',
    matricula: `MAT-${id}`,
    empresa: null,
    contratante: null,
    titularId: null,
    motivo: null,
    obs: null,
    createdAt: '2026-03-26T12:00:00.000Z',
    updatedAt: '2026-03-26T12:00:00.000Z',
    ...over,
  }
}

const carregado = (d: UnimedDetail): DetailState => ({ data: d, isError: false, isFetching: false })
const comErro: DetailState = { data: undefined, isError: true, isFetching: false }
const carregando: DetailState = { data: undefined, isError: false, isFetching: true }

const salvar = () => screen.getByRole('button', { name: 'Salvar' })

beforeEach(() => {
  vi.clearAllMocks()
  detalhes = {}
})

describe('UnimedFormDialog: editar só com o cadastro carregado', () => {
  it('detalhe em erro: avisa, oferece "Tentar de novo" e não deixa salvar', () => {
    detalhes = { b1: comErro }
    render(<UnimedFormDialog open editId="b1" onClose={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados deste beneficiário')
    expect(screen.queryByText('Observações')).not.toBeInTheDocument()
    expect(salvar()).toBeDisabled()

    fireEvent.click(salvar())
    expect(updateUnimed).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('detalhe ainda carregando: Salvar desligado', () => {
    detalhes = { b1: carregando }
    render(<UnimedFormDialog open editId="b1" onClose={() => {}} />)
    expect(salvar()).toBeDisabled()
  })

  it('cadastro carregado: mostra os dados e salva', async () => {
    detalhes = { b1: carregado(beneficiario('b1')) }
    render(<UnimedFormDialog open editId="b1" onClose={() => {}} />)

    expect(screen.getByDisplayValue('MAT-b1')).toBeInTheDocument()
    expect(salvar()).toBeEnabled()
    fireEvent.click(salvar())
    await waitFor(() => expect(updateUnimed).toHaveBeenCalledTimes(1))
    expect(updateUnimed.mock.calls[0][0]).toMatchObject({ matricula: 'MAT-b1', plano: 'UNIMED NACIONAL' })
  })

  it('trocar para um beneficiário que falhou não aproveita os dados do anterior', () => {
    detalhes = { b1: carregado(beneficiario('b1')), b2: comErro }
    const { rerender } = render(<UnimedFormDialog open editId="b1" onClose={() => {}} />)
    expect(screen.getByDisplayValue('MAT-b1')).toBeInTheDocument()

    // Fecha e abre outro, como a tela faz (editId volta a null ao fechar).
    rerender(<UnimedFormDialog open={false} editId={null} onClose={() => {}} />)
    rerender(<UnimedFormDialog open editId="b2" onClose={() => {}} />)

    expect(screen.queryByDisplayValue('MAT-b1')).not.toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    fireEvent.click(salvar())
    expect(updateUnimed).not.toHaveBeenCalled()
  })

  it('o formulário é zerado ao fechar: "novo" depois de uma edição abre vazio', () => {
    detalhes = { b1: carregado(beneficiario('b1')) }
    const { rerender } = render(<UnimedFormDialog open editId="b1" onClose={() => {}} />)
    expect(screen.getByDisplayValue('MAT-b1')).toBeInTheDocument()

    rerender(<UnimedFormDialog open={false} editId={null} onClose={() => {}} />)
    rerender(<UnimedFormDialog open editId={null} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Novo beneficiário' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('MAT-b1')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('MAE DA PESSOA')).not.toBeInTheDocument()
  })
})
