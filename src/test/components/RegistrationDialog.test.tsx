import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Course } from '@/@types/course'
import { ApiError } from '@/lib/api'
import '@/i18n'

// Inscrição pelo site: o CPF só acha cadastro com os 4 últimos dígitos de um
// telefone dele. O backend responde igual para "CPF sem cadastro" e "telefone
// errado" (o site segue para o formulário); 5 erros por hora no mesmo CPF dão 429.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
vi.mock('@/hooks/useSiteSettings', () => ({
  usePublicSiteSettings: () => ({ data: { whatsapp: '(44) 99999-0000' } }),
  useOrgInfo: () => ({ phone: '(44) 3333-3333' }),
}))

const { RegistrationDialog } = await import('@/components/courses/RegistrationDialog')

const COURSE = {
  id: 'c1', title: 'Curso de Soja', startDate: '2026-12-01', endDate: '2026-12-01',
  startTime: '08:00', endTime: '17:00', location: 'Auditório',
} as Course

const CPF_VALIDO = '529.982.247-25'

function ok(body: unknown) {
  return { json: () => Promise.resolve(body) }
}

function abrir() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RegistrationDialog open course={COURSE} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

const cpfField = () => screen.getByLabelText('CPF / CIN')
const phoneEndField = () => screen.getByLabelText('4 últimos números do seu telefone')
const continuar = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

function preencher(cpf = CPF_VALIDO, end = '1234') {
  fireEvent.change(cpfField(), { target: { value: cpf } })
  fireEvent.change(phoneEndField(), { target: { value: end } })
}

function bodyOf(call: number) {
  return JSON.parse((apiFetch.mock.calls[call][1] as RequestInit).body as string)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Inscrição pelo site: CPF + 4 últimos dígitos do telefone', () => {
  it('"Continuar" só liga com CPF válido e os 4 dígitos', () => {
    abrir()
    const botao = screen.getByRole('button', { name: 'Continuar' })
    expect(botao).toBeDisabled()
    fireEvent.change(cpfField(), { target: { value: CPF_VALIDO } })
    expect(botao).toBeDisabled()
    fireEvent.change(phoneEndField(), { target: { value: '12' } })
    expect(botao).toBeDisabled()
    fireEvent.change(phoneEndField(), { target: { value: '1234' } })
    expect(botao).toBeEnabled()
  })

  it('o campo aceita só números, no máximo 4', () => {
    abrir()
    fireEvent.change(phoneEndField(), { target: { value: '12a3-456' } })
    expect(phoneEndField()).toHaveValue('1234')
  })

  it('consulta por POST (CPF fora da URL), com os dois dados, e confirma o cadastro achado', async () => {
    apiFetch.mockResolvedValueOnce(ok({ found: true, name: 'João D. S.' }))
    abrir()
    preencher()
    continuar()

    expect(await screen.findByText('João D. S.')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch.mock.calls[0][0]).toBe('/users/lookup-cpf')
    expect((apiFetch.mock.calls[0][1] as RequestInit).method).toBe('POST')
    expect(bodyOf(0)).toEqual({ cpf: '52998224725', phoneEnd: '1234' })

    apiFetch.mockResolvedValueOnce(ok({}))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, confirmar inscrição' }))
    await screen.findByText('Inscrição realizada!')
    expect(apiFetch.mock.calls[1][0]).toBe('/courses/c1/register-by-cpf')
    expect(bodyOf(1)).toEqual({ cpf: '52998224725', phoneEnd: '1234' })
  })

  it('CPF sem cadastro ou telefone que não bate: segue para o formulário', async () => {
    apiFetch.mockResolvedValueOnce(ok({ found: false, name: null }))
    abrir()
    preencher()
    continuar()
    expect(await screen.findByText('Cadastro do participante')).toBeInTheDocument()
    expect(screen.getByText(/Não encontramos cadastro com esse CPF e telefone/)).toBeInTheDocument()
  })

  it('429 na consulta mostra a mensagem do servidor e fica no passo do CPF', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(429, 'Muitas tentativas com este CPF. Aguarde uma hora ou procure o Sindicato.'))
    abrir()
    preencher()
    continuar()
    expect(await screen.findByText(/Muitas tentativas com este CPF/)).toBeInTheDocument()
    expect(screen.queryByText('Cadastro do participante')).not.toBeInTheDocument()
  })

  it('404 ao confirmar mostra a mensagem do servidor', async () => {
    apiFetch.mockResolvedValueOnce(ok({ found: true, name: 'João D. S.' }))
    abrir()
    preencher()
    continuar()
    await screen.findByText('João D. S.')

    apiFetch.mockRejectedValueOnce(new ApiError(404, 'Não encontramos cadastro com este CPF e telefone.'))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, confirmar inscrição' }))
    expect(await screen.findByText('Não encontramos cadastro com este CPF e telefone.')).toBeInTheDocument()
  })

  it.each([
    ['texto antigo (inglês)', 'User already registered for this course'],
    ['texto novo (português)', 'Esta pessoa já está inscrita neste curso.'],
  ])('"Já inscrito" leva à tela de inscrição existente: %s', async (_nome, mensagem) => {
    apiFetch.mockResolvedValueOnce(ok({ found: true, name: 'João D. S.' }))
    abrir()
    preencher()
    continuar()
    await screen.findByText('João D. S.')

    apiFetch.mockRejectedValueOnce(new ApiError(409, mensagem))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, confirmar inscrição' }))
    expect(await screen.findByText('Você já está inscrito neste curso.')).toBeInTheDocument()
  })
})

describe('Inscrição pelo site: cadastro novo', () => {
  async function irAoFormulario() {
    apiFetch.mockResolvedValueOnce(ok({ found: false, name: null }))
    abrir()
    preencher()
    continuar()
    await screen.findByText('Cadastro do participante')
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria da Silva' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '44999991234' } })
    fireEvent.click(screen.getByRole('checkbox'))
  }

  it('409 "Procure o Sindicato" mostra a mensagem e o link do WhatsApp', async () => {
    await irAoFormulario()
    apiFetch.mockRejectedValueOnce(new ApiError(
      409,
      'Não foi possível confirmar seu cadastro pelo site. Procure o Sindicato para fazer a inscrição.',
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))

    expect(await screen.findByText(/Não foi possível confirmar seu cadastro pelo site/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /WhatsApp/ })
    expect(link).toHaveAttribute('href', 'https://wa.me/5544999990000')
    expect(apiFetch.mock.calls[1][0]).toBe('/courses/c1/register-full')
    expect(bodyOf(1)).toMatchObject({ cpf: '52998224725', phone: '44999991234' })
  })

  it('outros erros não mostram o link do WhatsApp', async () => {
    await irAoFormulario()
    apiFetch.mockRejectedValueOnce(new ApiError(429, 'Muitas tentativas com este CPF. Aguarde uma hora ou procure o Sindicato.'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))

    expect(await screen.findByText(/Muitas tentativas com este CPF/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
  })

  it.each([
    ['texto antigo (inglês)', 'User already registered for this course'],
    ['texto novo (português)', 'Esta pessoa já está inscrita neste curso.'],
  ])('"já inscrito" no cadastro novo também abre a tela de inscrição existente: %s', async (_nome, mensagem) => {
    await irAoFormulario()
    apiFetch.mockRejectedValueOnce(new ApiError(409, mensagem))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))
    expect(await screen.findByText('Você já está inscrito neste curso.')).toBeInTheDocument()
  })

  it('o link some ao tentar de novo', async () => {
    await irAoFormulario()
    apiFetch.mockRejectedValueOnce(new ApiError(409, 'Não foi possível confirmar seu cadastro pelo site. Procure o Sindicato para fazer a inscrição.'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))
    await screen.findByRole('link', { name: /WhatsApp/ })

    apiFetch.mockResolvedValueOnce(ok({}))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument())
  })
})
