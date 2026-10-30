import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReciboButton } from '@/components/financeiro/ReciboButton'
import type { ReciboData } from '@/lib/recibo'

// A biblioteca de PDF só carrega no clique; aqui ela é trocada para não gerar PDF de verdade.
const downloadRecibo = vi.fn()
vi.mock('@/lib/recibo-pdf', () => ({ downloadRecibo: (...args: unknown[]) => downloadRecibo(...args) }))
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }))

const ORG = { street: 'Rua José Tondato, 80', district: 'Centro', city: 'Terra Roxa', state: 'PR', zip: '85990-000', phone: '(44) 3645-2199' }

const lancamento = (parte: Partial<ReciboData>): ReciboData => ({
  type: 'IN', transferId: null, amountCents: 50000, date: '2026-10-30T00:00:00.000Z', description: 'MENSALIDADE',
  empenho: { razaoSocial: 'COOPERATIVA LTDA', cnpjCpf: '11222333000181' }, ...parte,
})

const NOME = 'Gerar recibo em PDF'

beforeEach(() => {
  downloadRecibo.mockReset()
  toastError.mockReset()
})

describe('ReciboButton: só aparece em entrada', () => {
  it('entrada comum: o botão existe, com o título e o nome acessível', () => {
    render(<ReciboButton tx={lancamento({})} org={ORG} />)
    const botao = screen.getByRole('button', { name: NOME })
    expect(botao).toHaveAttribute('title', NOME)
    expect(botao).toBeEnabled()
  })

  it('saída: nada na tela', () => {
    const { container } = render(<ReciboButton tx={lancamento({ type: 'OUT' })} org={ORG} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('"só nota" (sem tipo): nada na tela', () => {
    render(<ReciboButton tx={lancamento({ type: null })} org={ORG} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('perna de entrada de uma transferência entre caixas: nada na tela', () => {
    render(<ReciboButton tx={lancamento({ type: 'IN', transferId: 'tr-1' })} org={ORG} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ReciboButton: o clique', () => {
  it('gera o recibo com os dados do lançamento e do sindicato', async () => {
    downloadRecibo.mockResolvedValue(undefined)
    const tx = lancamento({ number: 12 })
    render(<ReciboButton tx={tx} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(downloadRecibo).toHaveBeenCalledTimes(1))
    const [dados, emissor] = downloadRecibo.mock.calls[0]
    expect(dados).toBe(tx)
    expect(emissor).toMatchObject({ cidade: 'Terra Roxa', telefone: '(44) 3645-2199', linhasEndereco: ['Rua José Tondato, 80, Centro', 'Terra Roxa – PR, 85990-000'] })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('fica desligado enquanto gera e volta ao normal depois', async () => {
    let terminar: () => void = () => {}
    downloadRecibo.mockReturnValue(new Promise<void>(resolve => { terminar = resolve }))
    render(<ReciboButton tx={lancamento({})} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(screen.getByRole('button', { name: NOME })).toBeDisabled())
    terminar()
    await waitFor(() => expect(screen.getByRole('button', { name: NOME })).toBeEnabled())
  })

  it('se o PDF falhar, avisa em português e o botão volta', async () => {
    downloadRecibo.mockRejectedValue(new Error('boom'))
    render(<ReciboButton tx={lancamento({})} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Erro ao gerar o recibo.'))
    expect(screen.getByRole('button', { name: NOME })).toBeEnabled()
  })
})
