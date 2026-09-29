import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { FinancePaymentMethod } from '@/hooks/useFinance'

// Hooks simulados: o teste cobre só a aba, sem rede.
let lista: { data?: FinancePaymentMethod[]; isLoading: boolean; isError: boolean }
const criar = vi.fn().mockResolvedValue({})
const atualizar = vi.fn().mockResolvedValue({})
const excluir = vi.fn().mockResolvedValue({})

vi.mock('@/hooks/useFinance', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useFinance')>()),
  useFinancePaymentMethods: () => lista,
  useCreateFinancePaymentMethod: () => ({ mutateAsync: criar, isPending: false }),
  useUpdateFinancePaymentMethod: () => ({ mutateAsync: atualizar, isPending: false }),
  useDeleteFinancePaymentMethod: () => ({ mutateAsync: excluir, isPending: false }),
}))

const { PaymentMethodsTab } = await import('@/components/financeiro/PaymentMethodsTab')

function forma(over: Partial<FinancePaymentMethod> = {}): FinancePaymentMethod {
  return { id: 'pm1', name: 'PIX', active: true, order: 0, ...over } as FinancePaymentMethod
}

const tudoLiberado = { enabled: true, canCreate: true, canUpdate: true, canDelete: true }

beforeEach(() => {
  vi.clearAllMocks()
  lista = { data: [forma()], isLoading: false, isError: false }
})

describe('PaymentMethodsTab', () => {
  it('lista as formas cadastradas', () => {
    render(<PaymentMethodsTab {...tudoLiberado} />)
    expect(screen.getByText('PIX')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })

  it('cadastra uma forma nova', async () => {
    render(<PaymentMethodsTab {...tudoLiberado} />)
    fireEvent.click(screen.getByRole('button', { name: /Nova forma/ }))
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'boleto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))
    // Manda como foi digitado: quem põe em caixa alta é o backend.
    await waitFor(() => expect(criar).toHaveBeenCalledWith('boleto'))
  })

  it('exclui uma forma, avisando que os lançamentos antigos não mudam', async () => {
    // O buraco que esta aba veio fechar: a forma só nascia pelo select do
    // lançamento e não havia como apagar um nome digitado errado.
    render(<PaymentMethodsTab {...tudoLiberado} />)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir PIX' }))
    expect(screen.getByText(/não mudam/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))
    await waitFor(() => expect(excluir).toHaveBeenCalledWith('pm1'))
  })

  it('desativa sem apagar, pela edição', async () => {
    render(<PaymentMethodsTab {...tudoLiberado} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar PIX' }))
    fireEvent.click(screen.getByRole('button', { name: /Ativa \(aparece/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(atualizar).toHaveBeenCalledWith({ id: 'pm1', body: { name: 'PIX', active: false } }),
    )
  })

  it('sem permissão de criar, não mostra o botão de nova forma', () => {
    render(<PaymentMethodsTab {...tudoLiberado} canCreate={false} />)
    expect(screen.queryByRole('button', { name: /Nova forma/ })).toBeNull()
  })

  it('sem permissão de editar nem excluir, a linha não oferece ação', () => {
    render(<PaymentMethodsTab {...tudoLiberado} canUpdate={false} canDelete={false} />)
    expect(screen.queryByRole('button', { name: /PIX/ })).toBeNull()
  })

  it('lista vazia explica para que serve', () => {
    lista = { data: [], isLoading: false, isError: false }
    render(<PaymentMethodsTab {...tudoLiberado} />)
    expect(screen.getByText('Nenhuma forma de pagamento')).toBeInTheDocument()
  })

  it('falha de carregamento aparece como erro, não como lista vazia', () => {
    lista = { data: undefined, isLoading: false, isError: true }
    render(<PaymentMethodsTab {...tudoLiberado} />)
    expect(screen.getByText(/Erro ao carregar as formas/)).toBeInTheDocument()
  })
})
