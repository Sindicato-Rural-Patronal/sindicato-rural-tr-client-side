import { describe, it, expect } from 'vitest'
import { pessoaSchema, roomSchema, courseBaseSchema } from '@/lib/schemas'

describe('pessoaSchema', () => {
  const valid = { name: 'João Silva', email: 'joao@email.com', phone: '11987654321', cpf: '123.456.789-01' }

  it('valida dados corretos', () => {
    expect(pessoaSchema.safeParse(valid).success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = pessoaSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = pessoaSchema.safeParse({ ...valid, email: 'nao-e-email' })
    expect(result.success).toBe(false)
  })

  it('rejeita CPF com menos de 11 dígitos', () => {
    const result = pessoaSchema.safeParse({ ...valid, cpf: '123.456' })
    expect(result.success).toBe(false)
  })

  it('rejeita telefone com menos de 10 dígitos', () => {
    const result = pessoaSchema.safeParse({ ...valid, phone: '1198' })
    expect(result.success).toBe(false)
  })

  it('rejeita objeto vazio', () => {
    expect(pessoaSchema.safeParse({}).success).toBe(false)
  })
})

describe('roomSchema', () => {
  const valid = { name: 'Sala A', description: 'Sala principal', maxCapacity: 30 }

  it('valida dados corretos', () => {
    expect(roomSchema.safeParse(valid).success).toBe(true)
  })

  it('rejeita capacidade 0', () => {
    const result = roomSchema.safeParse({ ...valid, maxCapacity: 0 })
    expect(result.success).toBe(false)
  })

  it('rejeita nome vazio', () => {
    const result = roomSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })
})

describe('courseBaseSchema', () => {
  const valid = {
    name: 'Curso de Milho',
    status: 'PUBLIC' as const,
    startDate: '2025-06-01',
    startHour: '08:00',
    endDate: '2025-06-30',
    endHour: '17:00',
  }

  it('valida dados mínimos obrigatórios', () => {
    expect(courseBaseSchema.safeParse(valid).success).toBe(true)
  })

  it('rejeita título vazio', () => {
    const result = courseBaseSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita startDate vazio', () => {
    const result = courseBaseSchema.safeParse({ ...valid, startDate: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita endDate vazio', () => {
    const result = courseBaseSchema.safeParse({ ...valid, endDate: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita status inválido', () => {
    const result = courseBaseSchema.safeParse({ ...valid, status: 'INVALIDO' })
    expect(result.success).toBe(false)
  })

  it('aceita price = 0', () => {
    const result = courseBaseSchema.safeParse({ ...valid, price: 0 })
    expect(result.success).toBe(true)
  })
})
