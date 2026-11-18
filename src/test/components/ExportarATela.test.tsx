import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { lerCatalogo } from '@/components/export/report-builder'
import { CATALOGO_LANCAMENTOS_CRU } from '../lib/export-catalog.fixture'

// "Exportar o que está na tela" (decisão 007, SR-150): leva as colunas, os filtros
// e a ordem da tela, com `visao` = o nome da visão. Um clique baixa.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const exportarRelatorio = vi.fn()
vi.mock('@/lib/export', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/export')>()),
  exportarRelatorio: (...args: unknown[]) => exportarRelatorio(...args),
}))

const { ExportarATela } = await import('@/components/visoes/ExportarATela')

const catalogo = lerCatalogo(CATALOGO_LANCAMENTOS_CRU)!
const COLS = ['number', 'date', 'payeeName', 'payeeDocument', 'amount']

function abrir(props: Partial<ComponentProps<typeof ExportarATela>> = {}) {
  return render(
    <ExportarATela
      dataset="finance-transactions"
      catalog={catalogo}
      cols={COLS}
      filtros={{ from: '2026-10-01', to: '2026-10-31', type: 'IN', excludeTransfers: true }}
      filtrosTexto={['Período: 01/10/2026 a 31/10/2026', 'Tipo: Entrada', 'Sem transferências entre caixas']}
      total={8}
      visaoRotulo="Contabilidade (alterada)"
      visao="Contabilidade (alterada)"
      nomes={{ um: 'lançamento', varios: 'lançamentos' }}
      textoDosTotais="O Excel e o PDF trazem o total de entradas no fim."
      celular={false}
      {...props}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  exportarRelatorio.mockResolvedValue({ count: 8, abriuAba: false })
})

describe('ExportarATela', () => {
  it('o resumo diz quantos, quantas colunas, a visão, os filtros, os dados pessoais e os totais', async () => {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(await screen.findByText('Exportar o que está na tela')).toBeInTheDocument()
    expect(screen.getByText(/8 lançamentos · 5 colunas · Visão:/)).toBeInTheDocument()
    expect(screen.getByText('Contabilidade (alterada)')).toBeInTheDocument()
    expect(screen.getByText(/Filtros: Período: 01\/10\/2026 a 31\/10\/2026 · Tipo: Entrada · Sem transferências/)).toBeInTheDocument()
    expect(screen.getByText(/Leva dados pessoais: CNPJ \/ CPF\./)).toBeInTheDocument()
    expect(screen.getByText('O Excel e o PDF trazem o total de entradas no fim.')).toBeInTheDocument()
    // Os 4 formatos lado a lado, no computador.
    for (const nome of ['Planilha CSV', 'Excel (.xlsx)', 'PDF', 'Imprimir']) {
      expect(screen.getByRole('button', { name: nome })).toBeEnabled()
    }
  })

  it('um clique baixa: as colunas da tela, os filtros e `visao` (nunca `modelo`)', async () => {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Excel (.xlsx)' }))
    await waitFor(() => expect(exportarRelatorio).toHaveBeenCalledTimes(1))
    const [dataset, filtros, formato, opcoes] = exportarRelatorio.mock.calls[0]
    expect(dataset).toBe('finance-transactions')
    expect(filtros).toEqual({ from: '2026-10-01', to: '2026-10-31', type: 'IN', excludeTransfers: true })
    expect(formato).toBe('xlsx')
    expect(opcoes).toMatchObject({ fields: COLS, visao: 'Contabilidade (alterada)', recusarVazio: true })
    expect(opcoes).not.toHaveProperty('modelo')
    expect(toast.success).toHaveBeenCalledWith('Planilha do Excel com 8 registros baixada.')
  })

  it('PDF acima de 2.000 linhas: PDF e Imprimir desligados, com o motivo embaixo', async () => {
    abrir({ total: 2001 })
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(await screen.findByRole('button', { name: 'PDF' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Planilha CSV' })).toBeEnabled()
    expect(screen.getByText('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')).toBeInTheDocument()
  })

  it('a partir de 9 colunas avisa que o PDF sai deitado e com letra menor', async () => {
    abrir({ cols: ['number', 'date', 'type', 'account', 'category', 'description', 'method', 'payeeName', 'amount'] })
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(await screen.findByText('Com 9 colunas o PDF sai deitado e com letra menor.')).toBeInTheDocument()
  })

  it('erro da API aparece dentro do popover, como veio', async () => {
    exportarRelatorio.mockRejectedValue(Object.assign(new Error('Muitas exportações seguidas. Aguarde um minuto e tente de novo.'), {}))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Planilha CSV' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('celular: folha de baixo com CSV, Excel e PDF, sem Imprimir', async () => {
    abrir({ celular: true })
    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(await screen.findByRole('button', { name: 'PDF' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument()
  })
})
