import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api'
import type { ReciboData } from '@/lib/recibo'

// A biblioteca de PDF só carrega no clique; aqui ela é trocada para não gerar PDF de verdade.
const downloadRecibo = vi.fn()
vi.mock('@/lib/recibo-pdf', () => ({ downloadRecibo: (...args: unknown[]) => downloadRecibo(...args) }))
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }))
// O registro na auditoria (POST /admin/export/documents/recibo) antes do PDF.
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { ReciboButton } = await import('@/components/financeiro/ReciboButton')

const ORG = { street: 'Rua José Tondato, 80', district: 'Centro', city: 'Terra Roxa', state: 'PR', zip: '85990-000', phone: '(44) 3645-2199' }

const lancamento = (parte: Partial<ReciboData>): ReciboData => ({
  type: 'IN', transferId: null, amountCents: 50000, date: '2026-10-30T00:00:00.000Z', description: 'MENSALIDADE',
  empenho: { razaoSocial: 'COOPERATIVA LTDA', cnpjCpf: '11222333000181' }, ...parte,
})

const NOME = 'Gerar recibo em PDF'

beforeEach(() => {
  downloadRecibo.mockReset()
  toastError.mockReset()
  apiFetch.mockReset()
  apiFetch.mockResolvedValue({ status: 204 })
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

  it('antes do PDF, o recibo vai para a auditoria com o Nº, quem pagou e o lançamento (SR-106)', async () => {
    const ordem: string[] = []
    apiFetch.mockImplementation(() => { ordem.push('auditoria'); return Promise.resolve({ status: 204 }) })
    downloadRecibo.mockImplementation(() => { ordem.push('pdf'); return Promise.resolve() })
    render(<ReciboButton tx={lancamento({ id: 'tx-9', number: 128 })} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(downloadRecibo).toHaveBeenCalled())
    expect(ordem).toEqual(['auditoria', 'pdf'])
    const [rota, init] = apiFetch.mock.calls[0]
    expect(rota).toBe('/admin/export/documents/recibo')
    expect(JSON.parse(init.body)).toEqual({ linhas: 1, alvo: 'Nº 128 · COOPERATIVA LTDA', ids: ['tx-9'], escopo: 'seleção' })
  })

  it('se a auditoria não registrar (429), mostra a mensagem da API e NÃO gera o recibo', async () => {
    apiFetch.mockRejectedValue(new ApiError(429, 'Muitos documentos seguidos. Aguarde um minuto e tente de novo.'))
    render(<ReciboButton tx={lancamento({ id: 'tx-9' })} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Muitos documentos seguidos. Aguarde um minuto e tente de novo.'))
    expect(downloadRecibo).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: NOME })).toBeEnabled()
  })

  it('sem permissão (403): avisa e não gera', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'))
    render(<ReciboButton tx={lancamento({})} org={ORG} />)
    await userEvent.click(screen.getByRole('button', { name: NOME }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Você não tem permissão para gerar este documento.'))
    expect(downloadRecibo).not.toHaveBeenCalled()
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
