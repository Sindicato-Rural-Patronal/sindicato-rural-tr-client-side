import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FinanceTransaction } from '@/hooks/useFinance'

// SR-140: o relatório de receitas vai para a auditoria ANTES de gerar o PDF, e se o
// registro falhar o PDF não é gerado.

const buscar = vi.fn()
vi.mock('@/hooks/useFinance', () => ({
  fetchFinanceTransactionsForRange: (...a: unknown[]) => buscar(...a),
}))
const registrar = vi.fn()
vi.mock('@/lib/registrar-documento', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/registrar-documento')>()),
  registrarDocumento: (...a: unknown[]) => registrar(...a),
}))
const baixar = vi.fn()
vi.mock('@/lib/relatorio-receitas-pdf', () => ({
  downloadRelatorioReceitasPdf: (...a: unknown[]) => baixar(...a),
}))

const { gerarRelatorioReceitas } = await import('@/lib/gerar-relatorio-receitas')

const entidade = { nome: 'S', cnpj: '', endereco: '', cepCidade: '', telefone: '', site: '' }
const range = { from: '2026-11-01', to: '2026-11-30' }
const lanc = (over: Partial<FinanceTransaction>) =>
  ({ id: 'x', type: 'IN', transferId: null, ...over }) as FinanceTransaction

beforeEach(() => {
  vi.clearAllMocks()
})

describe('gerarRelatorioReceitas', () => {
  it('registra na auditoria com o número de entradas e o período, e só depois gera', async () => {
    const txns = [lanc({}), lanc({}), lanc({ type: 'OUT' }), lanc({ transferId: 't' }), lanc({ type: null })]
    buscar.mockResolvedValue(txns)
    const ordem: string[] = []
    registrar.mockImplementation(async () => { ordem.push('registrar') })
    baixar.mockImplementation(async () => { ordem.push('baixar') })

    await gerarRelatorioReceitas(range, entidade)

    expect(buscar).toHaveBeenCalledWith(range)
    expect(registrar).toHaveBeenCalledWith('relatorio-receitas', {
      linhas: 2, alvo: '01/11/2026 a 30/11/2026', escopo: 'com filtros',
    })
    expect(baixar).toHaveBeenCalledWith(txns, entidade, range)
    expect(ordem).toEqual(['registrar', 'baixar'])
  })

  it('se o registro falhar, não gera o PDF e o erro sobe', async () => {
    buscar.mockResolvedValue([lanc({})])
    registrar.mockRejectedValue(new Error('sem internet'))
    await expect(gerarRelatorioReceitas(range, entidade)).rejects.toThrow('sem internet')
    expect(baixar).not.toHaveBeenCalled()
  })

  it('sem entrada no período registra 0 linhas e ainda gera (o PDF diz que não há receita)', async () => {
    buscar.mockResolvedValue([])
    registrar.mockResolvedValue(undefined)
    await gerarRelatorioReceitas(range, entidade)
    expect(registrar.mock.calls[0][1]).toMatchObject({ linhas: 0 })
    expect(baixar).toHaveBeenCalledTimes(1)
  })
})
