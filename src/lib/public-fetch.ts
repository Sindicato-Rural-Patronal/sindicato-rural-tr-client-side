import { API_BASE } from '@/lib/api'

/**
 * GET de rota pública com fetch cru: sem token, porque um token velho guardado
 * no navegador não pode deslogar nem redirecionar o visitante (o apiFetch faz
 * isso no 401). Erro HTTP vira `Error("HTTP nnn")`, que o query-client entende
 * (repete 5xx, não repete 4xx) e que a tela mostra como "Não foi possível
 * carregar" — nunca como lista vazia.
 */
export async function publicGet<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>
}
