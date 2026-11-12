import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { modeloDaEquipeCru } from '../lib/export-catalog.fixture'

// Os modelos de relatório da equipe (decisão 006, fase 3; contrato da SR-114).
// Sem a rota (back velho) ou sem a permissão da fonte, a lista é null e o
// montador fica só com os modelos de fábrica.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { useReportTemplates, useReportTemplateMutations, reportTemplatesKey } = await import('@/hooks/useReportTemplates')

let qc: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const json = (data: unknown) => Promise.resolve({ json: () => Promise.resolve(data) })

beforeEach(() => {
  vi.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('useReportTemplates', () => {
  it('lê a lista da fonte', async () => {
    apiFetch.mockReturnValue(json([modeloDaEquipeCru()]))
    const { result } = renderHook(() => useReportTemplates('people'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/people')
    expect(result.current.data?.map(t => t.name)).toEqual(['Telefones da equipe'])
  })

  it.each([
    [404, 'Route GET:/admin/report-templates/people not found'],
    [403, 'Forbidden'],
  ])('%i = null, sem erro', async (status, mensagem) => {
    apiFetch.mockRejectedValue(new ApiError(status, mensagem))
    const { result } = renderHook(() => useReportTemplates('people'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('falha do servidor fica como erro', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'HTTP 500'))
    const { result } = renderHook(() => useReportTemplates('people'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('desligado (montador fechado) não busca', () => {
    renderHook(() => useReportTemplates('people', { enabled: false }), { wrapper })
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe('useReportTemplateMutations', () => {
  it('salvar põe o modelo na lista na hora, na ordem do nome, e pede a lista de novo', async () => {
    qc.setQueryData(reportTemplatesKey('people'), [modeloDaEquipeCru({ id: 'z', name: 'Zeta' })])
    apiFetch.mockImplementation((_path: string, init?: RequestInit) =>
      init?.method === 'POST' ? json(modeloDaEquipeCru({ id: 'a', name: 'Alfa' })) : json([]))
    const invalidar = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useReportTemplateMutations('people'), { wrapper })
    await act(() => result.current.salvar.mutateAsync({ name: 'Alfa', fields: ['name'], format: 'csv' }))
    expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/people', {
      method: 'POST', body: JSON.stringify({ name: 'Alfa', fields: ['name'], format: 'csv' }),
    })
    expect(invalidar).toHaveBeenCalledWith({ queryKey: reportTemplatesKey('people') })
    const lista = qc.getQueryData<{ name: string }[]>(reportTemplatesKey('people'))
    expect(lista?.map(t => t.name)).toEqual(['Alfa', 'Zeta'])
  })

  it('mudar e excluir usam o id no caminho e atualizam a lista', async () => {
    qc.setQueryData(reportTemplatesKey('registrations'), [modeloDaEquipeCru({ id: 't/1' }), modeloDaEquipeCru({ id: 't2', name: 'B' })])
    apiFetch.mockImplementation((_path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return json(modeloDaEquipeCru({ id: 't2', name: 'A' }))
      if (init?.method === 'DELETE') return Promise.resolve({ status: 204 })
      return new Promise(() => {}) // a lista pedida de novo não volta: fica o que o hook pôs
    })
    const { result } = renderHook(() => useReportTemplateMutations('registrations'), { wrapper })
    await act(() => result.current.mudar.mutateAsync({ id: 't2', body: { name: 'A' } }))
    expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/registrations/t2', {
      method: 'PATCH', body: JSON.stringify({ name: 'A' }),
    })
    await act(() => result.current.excluir.mutateAsync('t/1'))
    expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/registrations/t%2F1', { method: 'DELETE' })
    const lista = qc.getQueryData<{ id: string; name: string }[]>(reportTemplatesKey('registrations'))
    expect(lista?.map(t => `${t.id}:${t.name}`)).toEqual(['t2:A'])
  })

  it('o erro da API chega a quem chamou, com a mensagem dela', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, 'Já existe um modelo da equipe com esse nome.'))
    const { result } = renderHook(() => useReportTemplateMutations('people'), { wrapper })
    await expect(result.current.salvar.mutateAsync({ name: 'X', fields: ['name'] }))
      .rejects.toThrow('Já existe um modelo da equipe com esse nome.')
  })
})
