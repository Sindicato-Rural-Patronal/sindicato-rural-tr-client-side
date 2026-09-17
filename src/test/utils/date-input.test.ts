import { describe, it, expect } from 'vitest'
import { maskDateBr, parseDateBr, ymdToBr } from '@/utils/date-input'

describe('maskDateBr', () => {
  it('põe as barras enquanto digita', () => {
    expect(maskDateBr('1')).toBe('1')
    expect(maskDateBr('12')).toBe('12')
    expect(maskDateBr('120')).toBe('12/0')
    expect(maskDateBr('1205')).toBe('12/05')
    expect(maskDateBr('120519')).toBe('12/05/19')
    expect(maskDateBr('12051952')).toBe('12/05/1952')
  })

  it('ignora o que não é dígito e para em 8 dígitos', () => {
    expect(maskDateBr('12-05.1952')).toBe('12/05/1952')
    expect(maskDateBr('12/05/19523')).toBe('12/05/1952')
    expect(maskDateBr('')).toBe('')
  })

  it('aceita data colada no formato AAAA-MM-DD', () => {
    expect(maskDateBr('1952-05-12')).toBe('12/05/1952')
    expect(maskDateBr('2026-9-1')).toBe('01/09/2026')
  })
})

describe('parseDateBr', () => {
  it('data completa e válida → AAAA-MM-DD', () => {
    expect(parseDateBr('12/05/1952')).toBe('1952-05-12')
    expect(parseDateBr('29/02/2024')).toBe('2024-02-29')
  })

  it('incompleta ou dia que não existe → null', () => {
    expect(parseDateBr('12/05/19')).toBeNull()
    expect(parseDateBr('31/02/2026')).toBeNull()
    expect(parseDateBr('29/02/2025')).toBeNull()
    expect(parseDateBr('00/05/2026')).toBeNull()
    expect(parseDateBr('10/13/2026')).toBeNull()
    expect(parseDateBr('')).toBeNull()
  })

  it('respeita o intervalo de anos', () => {
    expect(parseDateBr('01/01/1919', { fromYear: 1920 })).toBeNull()
    expect(parseDateBr('01/01/1920', { fromYear: 1920 })).toBe('1920-01-01')
    expect(parseDateBr('01/01/2032', { toYear: 2031 })).toBeNull()
  })
})

describe('ymdToBr', () => {
  it('AAAA-MM-DD ou ISO completo → dd/mm/aaaa', () => {
    expect(ymdToBr('1952-05-12')).toBe('12/05/1952')
    expect(ymdToBr('2026-09-20T00:00:00.000Z')).toBe('20/09/2026')
  })

  it('vazio ou fora do formato → vazio', () => {
    expect(ymdToBr('')).toBe('')
    expect(ymdToBr(null)).toBe('')
    expect(ymdToBr('20/09/2026')).toBe('')
  })
})
