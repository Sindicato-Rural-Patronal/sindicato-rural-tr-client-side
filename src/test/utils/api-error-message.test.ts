// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@/i18n'
import { apiErrorMessage, loadErrorMessage } from '@/lib/api-error-message'
import { ApiError } from '@/lib/api'

describe('apiErrorMessage', () => {
  it('traduz mensagem conhecida do backend pra pt-BR', () => {
    expect(apiErrorMessage(new ApiError(404, 'Course not found'))).toBe('Curso não encontrado.')
    expect(apiErrorMessage(new Error('Invalid username or password'))).toBe('Usuário ou senha inválidos.')
    expect(apiErrorMessage(new ApiError(409, 'CPF already in use'))).toBe('CPF já cadastrado.')
  })

  it('aceita string crua', () => {
    expect(apiErrorMessage('User not found')).toBe('Usuário não encontrado.')
  })

  it('"HTTP nnn" vira mensagem genérica traduzida', () => {
    expect(apiErrorMessage(new Error('HTTP 500'))).toBe('Ocorreu um erro inesperado. Tente novamente.')
  })

  it('409 do mês fechado (SR-054) aparece com o texto da API, nunca como erro genérico', () => {
    const texto = 'O mês 10/2026 está fechado no caixa "BANCO". Reabra o mês para mudar lançamentos dele.'
    expect(apiErrorMessage(new ApiError(409, texto), 'Erro ao salvar o lançamento.')).toBe(texto)
    expect(apiErrorMessage(new ApiError(409, texto), 'Erro ao transferir.')).toBe(texto)
  })

  it('400 em português da API (SR-055) aparece como veio nos formulários do Financeiro', () => {
    for (const texto of [
      'Data inválida: use um ano entre 1900 e 2999.',
      'Valor maior que o máximo em "amountCents": 2147483647.',
    ]) {
      expect(apiErrorMessage(new ApiError(400, texto), 'Erro ao salvar o lançamento.')).toBe(texto)
    }
  })

  it('mensagem desconhecida passa como veio; vazio usa fallback', () => {
    expect(apiErrorMessage(new Error('Mensagem exótica'))).toBe('Mensagem exótica')
    expect(apiErrorMessage(null, 'fallback local')).toBe('fallback local')
  })
})

describe('loadErrorMessage (consulta que não carregou)', () => {
  const TELA = 'Não foi possível carregar os lançamentos.'

  it('400 é filtro recusado: mostra o motivo da API (ex.: data do filtro com ano fora do intervalo)', () => {
    expect(loadErrorMessage(new ApiError(400, 'Data inválida: use um ano entre 1900 e 2999.'), TELA))
      .toBe('Data inválida: use um ano entre 1900 e 2999.')
  })

  it('rede, 5xx, 400 sem texto ou consulta sem erro: o texto da tela', () => {
    expect(loadErrorMessage(new TypeError('Failed to fetch'), TELA)).toBe(TELA)
    expect(loadErrorMessage(new ApiError(500, 'Erro interno do servidor.'), TELA)).toBe(TELA)
    expect(loadErrorMessage(new ApiError(502, 'HTTP 502'), TELA)).toBe(TELA)
    expect(loadErrorMessage(new ApiError(400, 'HTTP 400'), TELA)).toBe(TELA)
    expect(loadErrorMessage(null, TELA)).toBe(TELA)
  })
})
