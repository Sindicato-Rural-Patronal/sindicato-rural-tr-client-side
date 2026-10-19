// Para onde o servidor do container encaminha /api/* e de onde tira curso,
// notícia e cotações para as meta OpenGraph.
//
// Não existe valor padrão de propósito. O Dockerfile trazia o endereço da API
// de STAGING como padrão: se a variável faltasse no Coolify da produção, o site
// subia normalmente e gravava inscrições e mensagens reais (CPF, telefone,
// endereço) no banco de staging, com uma linha de log como único sinal. Em
// produção, sem BACKEND_URL o servidor não sobe. O padrão de desenvolvimento
// (http://localhost:3000) fica só no vite.config.ts.

export const MISSING_BACKEND_URL =
  'BACKEND_URL não definida. Em produção o servidor não sobe sem ela: defina o endereço da API ' +
  'deste ambiente (ex.: http://sindicato_api:3000 na rede interna) nas variáveis do Coolify ' +
  'ou no .env.production.'

/**
 * Lê a BACKEND_URL do ambiente. Devolve o endereço sem barra no fim, ou null
 * fora de produção quando ela não foi definida. Lança erro (com a mensagem que
 * vai para o log) quando falta em produção ou não é um endereço http(s).
 */
export function backendUrlFrom(env) {
  const raw = String(env.BACKEND_URL ?? '').trim()
  if (!raw) {
    if (env.NODE_ENV === 'production') throw new Error(MISSING_BACKEND_URL)
    return null
  }
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`BACKEND_URL inválida: "${raw}". Use o endereço completo, com http:// ou https://.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`BACKEND_URL inválida: "${raw}". Use o endereço completo, com http:// ou https://.`)
  }
  return raw.replace(/\/+$/, '')
}
