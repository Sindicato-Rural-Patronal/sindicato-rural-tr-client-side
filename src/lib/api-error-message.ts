import i18n from '@/i18n'

/**
 * Mensagens de erro do backend (inglês) → chave i18n em `apiErrors.*`.
 * O backend responde sempre em inglês; a tradução acontece aqui.
 */
const API_ERROR_KEYS: Record<string, string> = {
  'Unauthorized': 'apiErrors.unauthorized',
  'Forbidden': 'apiErrors.forbidden',
  'Invalid username or password': 'apiErrors.invalidCredentials',
  'Admin not found': 'apiErrors.adminNotFound',
  'Banner not found': 'apiErrors.bannerNotFound',
  'CEP not found': 'apiErrors.cepNotFound',
  'Contact message not found': 'apiErrors.contactMessageNotFound',
  'Course not found': 'apiErrors.courseNotFound',
  'Instructor not found': 'apiErrors.instructorNotFound',
  'News not found': 'apiErrors.newsNotFound',
  'Photo not found': 'apiErrors.photoNotFound',
  'Property not found': 'apiErrors.propertyNotFound',
  'Registration not found': 'apiErrors.registrationNotFound',
  'Room not found': 'apiErrors.roomNotFound',
  'Rule not found': 'apiErrors.ruleNotFound',
  'Permission rule not found': 'apiErrors.ruleNotFound',
  'Invalid role: permission rule not found': 'apiErrors.ruleNotFound',
  'User not found': 'apiErrors.userNotFound',
  'Invalid userDataId: user not found': 'apiErrors.userNotFound',
  'User relation not found': 'apiErrors.relationNotFound',
  'CPF already in use': 'apiErrors.cpfInUse',
  'RG already in use': 'apiErrors.rgInUse',
  'User already exists': 'apiErrors.userAlreadyExists',
  'Username already exists': 'apiErrors.usernameExists',
  'This user already has an admin account': 'apiErrors.userAlreadyAdmin',
  'User is already an instructor': 'apiErrors.alreadyInstructor',
  'Instructor already assigned to this course': 'apiErrors.instructorAlreadyAssigned',
  'User already registered for this course': 'apiErrors.alreadyRegistered',
  'Registrations unavailable for this course': 'apiErrors.registrationsUnavailable',
  'Room is already booked for this period': 'apiErrors.roomBooked',
  'startDate must be before endDate': 'apiErrors.startBeforeEnd',
  'No file provided': 'apiErrors.noFile',
  'No file uploaded': 'apiErrors.noFile',
  'Failed to cancel registration': 'apiErrors.failedCancelRegistration',
  'Failed to create course': 'apiErrors.failedCreateCourse',
  'Failed to create user': 'apiErrors.failedCreateUser',
  'Failed to create user record': 'apiErrors.failedCreateUser',
  'Failed to delete course': 'apiErrors.failedDeleteCourse',
  'Failed to delete news': 'apiErrors.failedDeleteNews',
  'Failed to update admin': 'apiErrors.failedUpdateAdmin',
  'Failed to update course': 'apiErrors.failedUpdateCourse',
  'Failed to update news': 'apiErrors.failedUpdateNews',
  'Failed to update user': 'apiErrors.failedUpdateUser',
}

/**
 * Traduz um erro vindo da API para o idioma atual.
 *
 * Aceita `Error`/`ApiError`, string crua ou qualquer unknown de um catch.
 * Mensagens conhecidas são traduzidas; desconhecidas aparecem como vieram
 * (útil pra debug); sem mensagem → `fallback` ou o genérico traduzido.
 */
export function apiErrorMessage(err: unknown, fallback?: string): string {
  const raw =
    typeof err === 'string' ? err
    : err instanceof Error ? err.message
    : ''

  const key = raw ? API_ERROR_KEYS[raw] : undefined
  if (key) return i18n.t(key)

  // apiFetch usa "HTTP <status>" quando o corpo não traz mensagem
  if (/^HTTP \d+$/.test(raw)) return i18n.t('apiErrors.generic')

  return raw || fallback || i18n.t('apiErrors.generic')
}
