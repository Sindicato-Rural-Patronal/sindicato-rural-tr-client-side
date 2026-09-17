import { z } from 'zod'
import { isValidCpf } from '@/utils/cpf'

// Validações do cadastro de pessoa, espelhando o backend (create-user-data.ts e
// o schema de update-user-data.ts). Rodam antes de qualquer requisição para o
// formulário apontar o campo com problema em vez de salvar pela metade.

export type PersonField = 'name' | 'email' | 'phone' | 'phone2' | 'phone3' | 'cpf' | 'rg' | 'driverLicense'

export type PersonFieldErrors = Partial<Record<PersonField, string>>

const digits = (v: string) => v.replace(/\D/g, '')
const emailSchema = z.email()

function checkField(field: PersonField, raw: string): string | null {
  const v = raw.trim()
  switch (field) {
    case 'name':
      return v ? null : 'Informe o nome.'
    case 'email':
      if (!v) return 'Informe o e-mail.'
      return emailSchema.safeParse(v).success ? null : 'E-mail inválido. Confira o endereço.'
    case 'phone':
      if (!v) return 'Informe o telefone.'
      return [10, 11].includes(digits(v).length) ? null : 'Telefone inválido: use DDD + número.'
    case 'phone2':
    case 'phone3':
      return !v || [10, 11].includes(digits(v).length) ? null : 'Telefone inválido: use DDD + número.'
    case 'cpf':
      if (!v) return 'Informe o CPF.'
      return isValidCpf(v) ? null : 'CPF inválido. Confira os números.'
    case 'rg': {
      const n = digits(v).length
      return !v || (n >= 7 && n <= 9) ? null : 'RG inválido: use de 7 a 9 dígitos.'
    }
    case 'driverLicense': {
      const d = digits(v)
      return !v || (d.length === 11 && !/^(\d)\1{10}$/.test(d)) ? null : 'CNH inválida: deve ter 11 dígitos.'
    }
  }
}

/**
 * Valida só os campos informados (quem chama escolhe: o cadastro novo manda
 * todos; a edição manda só os que mudaram). Nome, e-mail, telefone e CPF são
 * obrigatórios; os demais só são conferidos quando preenchidos.
 */
export function validatePersonFields(values: Partial<Record<PersonField, string>>): PersonFieldErrors {
  const errors: PersonFieldErrors = {}
  for (const [field, value] of Object.entries(values) as [PersonField, string | undefined][]) {
    if (value === undefined) continue
    const problem = checkField(field, value)
    if (problem) errors[field] = problem
  }
  return errors
}

/** Primeiro campo com erro, na ordem em que aparecem na tela. */
export function firstInvalidField(errors: PersonFieldErrors, order: readonly PersonField[]): PersonField | null {
  return order.find(f => errors[f]) ?? null
}

/** Leva o campo para o meio da tela (longe de barras fixas) e põe o cursor nele. */
export function focusFieldById(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.focus({ preventScroll: true })
}
