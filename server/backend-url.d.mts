export const MISSING_BACKEND_URL: string
/** BACKEND_URL sem barra no fim; null fora de produção quando não definida. */
export function backendUrlFrom(env: { BACKEND_URL?: string; NODE_ENV?: string }): string | null
