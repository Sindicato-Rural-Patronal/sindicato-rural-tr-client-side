import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'

// Mensagem do backend para inscrição repetida (CourseRegistrationAlreadyExistsError).
const ALREADY_REGISTERED = 'User already registered for this course'

// register-full com CPF que já tem cadastro e telefone que não confere (409). O
// backend já responde em português; a tela acrescenta o link do WhatsApp.
const CANNOT_CONFIRM_PREFIX = 'Não foi possível confirmar seu cadastro pelo site'

export function isAlreadyRegistered(e: unknown) {
  return e instanceof ApiError && e.status === 409 && e.message === ALREADY_REGISTERED
}

/** 409 "Procure o Sindicato": o CPF tem cadastro e o telefone digitado não é um dos dele. */
export function isCannotConfirmRegistration(e: unknown) {
  return e instanceof ApiError && e.status === 409 && e.message.startsWith(CANNOT_CONFIRM_PREFIX)
}

/**
 * Mensagem do erro da inscrição por CPF. O backend responde em português nos
 * 404 ("Não encontramos cadastro com este CPF e telefone."), 409 e 429 ("Muitas
 * tentativas com este CPF…"), e a mensagem dele é a que a pessoa precisa ler:
 * `apiErrorMessage` trocaria o 429 por um texto genérico de login.
 */
export function registrationErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.status === 429 && !/^(HTTP \d+|Too Many Requests)$/.test(e.message)) {
    return e.message
  }
  return apiErrorMessage(e, fallback)
}

/** Só os dígitos do campo "4 últimos dígitos do telefone" (no máximo 4). */
export function phoneEndOf(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}
