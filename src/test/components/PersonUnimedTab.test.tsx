import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { UnimedListResponse, UnimedRow } from '@/hooks/useUnimed'

// Hook e roteador simulados: o teste cobre só a aba (sem rede e sem react-pdf).
let query: { data?: UnimedListResponse; isLoading: boolean; isError: boolean }
const refetch = vi.fn()
const baixarFicha = vi.fn().mockResolvedValue(undefined)
const baixarTermo = vi.fn().mockResolvedValue(undefined)

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('@/hooks/useUnimed', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useUnimed')>()),
  useUnimedByPerson: () => ({ ...query, isFetching: false, refetch }),
}))
vi.mock('@/lib/unimed-docs', () => ({
  baixarFichaUnimed: (id: string) => baixarFicha(id),
  baixarTermoUnimed: (id: string) => baixarTermo(id),
  baixarContratoUnimed: vi.fn(),
  // Os textos de verdade são conferidos em unimed-docs.test.ts; aqui, só que a aba usa o do documento.
  ERRO_DO_DOCUMENTO_UNIMED: { ficha: 'erro da ficha', termo: 'erro do termo', contrato: 'erro do contrato' },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { PersonUnimedTab } = await import('@/components/unimed/PersonUnimedTab')
const { toast } = await import('sonner')

const PESSOA = 'p1'

function row(over: Partial<UnimedRow> = {}): UnimedRow {
  return {
    id: 'u1',
    userDataId: PESSOA,
    userData: { id: PESSOA, name: 'Maria da Silva', cpf: '11144477735' },
    plano: 'UNIMED NACIONAL',
    matricula: '12345',
    tipoDependente: 'NORMAL',
    grauDependencia: 'TITULAR',
    titularId: null,
    dataAdesao: '2026-03-26',
    createdAt: '2026-03-26T12:00:00.000Z',
    ...over,
  }
}

function setQuery(data?: UnimedRow[], partial: Partial<typeof query> = {}) {
  query = {
    data: data && { data, total: data.length, page: 1, limit: 50, totalPages: 1 },
    isLoading: false,
    isError: false,
    ...partial,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setQuery([])
})

describe('PersonUnimedTab', () => {
  it('mostra o estado vazio com o atalho para cadastrar', () => {
    render(<PersonUnimedTab userDataId={PESSOA} />)
    expect(screen.getByText('Esta pessoa não tem cadastro na Unimed.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cadastrar na Unimed/ })).toHaveAttribute('href', '/admin/unimed')
  })

  it('lista o cadastro da pessoa com os dados-chave e o link da tela da Unimed', () => {
    setQuery([row()])
    render(<PersonUnimedTab userDataId={PESSOA} />)

    expect(screen.getByText('Maria da Silva')).toBeInTheDocument()
    expect(screen.getByText('111.444.777-35')).toBeInTheDocument()
    expect(screen.getByText('UNIMED NACIONAL')).toBeInTheDocument()
    expect(screen.getByText('Titular')).toBeInTheDocument()
    expect(screen.getByText('26/03/2026')).toBeInTheDocument()
    expect(screen.getByText('Cadastro desta pessoa')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir na tela da Unimed/ })).toHaveAttribute('href', '/admin/unimed')
  })

  it('marca o dependente em que a pessoa é a titular', () => {
    setQuery([row({ id: 'u2', userDataId: 'p2', userData: { id: 'p2', name: 'João Filho', cpf: null }, titularId: PESSOA })])
    render(<PersonUnimedTab userDataId={PESSOA} />)
    expect(screen.getByText('Dependente (ela é a titular)')).toBeInTheDocument()
  })

  it('o botão Ficha baixa o PDF do cadastro', async () => {
    setQuery([row()])
    render(<PersonUnimedTab userDataId={PESSOA} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ficha' }))
    await waitFor(() => expect(baixarFicha).toHaveBeenCalledWith('u1'))
  })

  it('documento que não sai: a mensagem com o nome dele, não o rótulo do botão (SR-111)', async () => {
    baixarTermo.mockRejectedValueOnce(null)
    setQuery([row()])
    render(<PersonUnimedTab userDataId={PESSOA} />)
    fireEvent.click(screen.getByRole('button', { name: 'Termo' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('erro do termo'))
  })

  it('avisa quando a busca falha, com "Tentar de novo"', () => {
    setQuery(undefined, { isError: true })
    render(<PersonUnimedTab userDataId={PESSOA} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados da Unimed.')
    expect(screen.queryByText('Esta pessoa não tem cadastro na Unimed.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(refetch).toHaveBeenCalled()
  })
})
