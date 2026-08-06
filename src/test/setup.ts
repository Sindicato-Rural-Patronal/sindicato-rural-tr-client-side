import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Limpa o DOM entre os testes (evita elementos de um teste vazarem no próximo).
afterEach(() => {
  cleanup()
})
