import i18n from '@/i18n'
import { ApiError } from '@/lib/api'

/**
 * Mensagem da tela de login para cada tipo de falha. Antes tudo virava
 * "Usuário ou senha inválidos", inclusive o bloqueio por excesso de tentativas
 * (429) — e quem estava bloqueado continuava tentando —, o sistema fora do ar
 * e a falta de internet.
 */
export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return i18n.t('apiErrors.tooManyRequests')
    if (err.status >= 500) return i18n.t('login.serverDown')
    return i18n.t('login.invalidCredentials')
  }
  // fetch rejeitado (sem internet, servidor inalcançável): não houve resposta.
  return i18n.t('login.offline')
}
