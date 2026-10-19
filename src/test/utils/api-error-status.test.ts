import { describe, it, expect } from 'vitest'
import { apiErrorMessage } from '@/lib/api-error-message'
import { ApiError } from '@/lib/api'
import '@/i18n'

describe('apiErrorMessage: 413 e 429 em português', () => {
  it('413 do proxy ou do backend vira "arquivo grande demais"', () => {
    expect(apiErrorMessage(new ApiError(413, 'Payload Too Large'))).toMatch(/grande demais/)
    expect(apiErrorMessage(new ApiError(413, 'Request body is too large'))).toMatch(/grande demais/)
    expect(apiErrorMessage(new Error('HTTP 413'))).toMatch(/grande demais/)
  })

  it('429 vira "muitas tentativas", com ou sem ApiError', () => {
    expect(apiErrorMessage(new ApiError(429, 'Too Many Requests'))).toMatch(/Muitas tentativas/)
    expect(apiErrorMessage(new Error('Too Many Requests'))).toMatch(/Muitas tentativas/)
    expect(apiErrorMessage(new Error('HTTP 429'))).toMatch(/Muitas tentativas/)
  })

  it('outros status continuam como antes', () => {
    expect(apiErrorMessage(new ApiError(404, 'Course not found'))).not.toMatch(/grande demais|Muitas tentativas/)
  })
})
