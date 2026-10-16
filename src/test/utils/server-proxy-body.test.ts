// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { BODY_LIMIT, postBytes } from './proxy-body-app.mjs'

const MB = 1024 * 1024

// O proxy do container repassa os uploads (fotos, banner, comprovante, ficha).
// Com o limite padrão do Fastify (1 MB), um upload de 2 MB voltava 413 antes de
// chegar ao backend, que aceita até 15 MB.
describe('proxy /api: tamanho do corpo', () => {
  it('fica acima dos 15 MB que o backend aceita', () => {
    expect(BODY_LIMIT).toBeGreaterThan(15 * MB)
  })

  it('deixa passar um upload de 2 MB inteiro', async () => {
    expect(await postBytes(2 * MB)).toEqual({ status: 200, size: 2 * MB })
  })

  it('deixa passar um comprovante de 15 MB', async () => {
    expect((await postBytes(15 * MB)).status).toBe(200)
  })

  it('recusa com 413 o que passa do limite', async () => {
    expect((await postBytes(BODY_LIMIT + 1)).status).toBe(413)
  })
})
