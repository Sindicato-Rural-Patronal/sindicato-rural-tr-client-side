import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Hooks simulados: o teste cobre só a lista de sugestões.
type Pessoa = {
  id: string; name: string; cpf: string | null
  memberStatus: 'ACTIVE' | 'INACTIVE' | null; membershipValidUntil: string | null
}
let pessoas: Pessoa[] = []
vi.mock('@/hooks/useAdmin', () => ({
  useAdminUsers: () => ({ data: { data: pessoas }, isFetching: false, isError: false }),
}))
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}))
// Sem espera do debounce: o termo vale na hora.
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (v: string) => v,
}))

const { PersonPicker } = await import('@/components/PersonPicker')

function abrirBusca(onPick = vi.fn()) {
  render(<PersonPicker onPick={onPick} />)
  const campo = screen.getByPlaceholderText(/Buscar pessoa/)
  fireEvent.change(campo, { target: { value: 'silva' } })
  return onPick
}

beforeEach(() => {
  pessoas = [
    { id: 'p1', name: 'JOSE DA SILVA', cpf: '39053344705', memberStatus: 'ACTIVE', membershipValidUntil: '2099-12-31T00:00:00.000Z' },
    { id: 'p2', name: 'ANA SILVA', cpf: null, memberStatus: 'ACTIVE', membershipValidUntil: null },
    { id: 'p3', name: 'PEDRO SILVA', cpf: null, memberStatus: 'ACTIVE', membershipValidUntil: '2000-01-01T00:00:00.000Z' },
    { id: 'p4', name: 'LUCIA SILVA', cpf: null, memberStatus: 'INACTIVE', membershipValidUntil: null },
    { id: 'p5', name: 'MARCOS SILVA', cpf: null, memberStatus: null, membershipValidUntil: null },
  ]
})

describe('PersonPicker: selo Associado nas sugestões', () => {
  it('mostra o selo ao lado do nome só de quem é associado em dia', () => {
    abrirBusca()
    const linha = (nome: string) => screen.getByText(nome).closest('button') as HTMLElement
    expect(linha('JOSE DA SILVA').querySelector('[data-testid="member-badge"]')).toBeInTheDocument()
    expect(linha('ANA SILVA').querySelector('[data-testid="member-badge"]')).toBeInTheDocument()
    expect(linha('PEDRO SILVA').querySelector('[data-testid="member-badge"]')).toBeNull()
    expect(linha('LUCIA SILVA').querySelector('[data-testid="member-badge"]')).toBeNull()
    expect(linha('MARCOS SILVA').querySelector('[data-testid="member-badge"]')).toBeNull()
    expect(screen.getAllByTestId('member-badge')).toHaveLength(2)
  })

  it('o nome continua truncando e o CPF continua à direita', () => {
    abrirBusca()
    const nome = screen.getByText('JOSE DA SILVA')
    expect(nome).toHaveClass('truncate')
    expect(screen.getByText('390.533.447-05')).toHaveClass('shrink-0')
  })

  it('escolher a pessoa continua entregando só id, nome e CPF', () => {
    const onPick = abrirBusca()
    fireEvent.click(screen.getByText('JOSE DA SILVA'))
    expect(onPick).toHaveBeenCalledWith({ id: 'p1', name: 'JOSE DA SILVA', cpf: '39053344705' })
  })
})
