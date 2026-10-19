import { API_BASE, ApiError } from '@/lib/api'

// Falha HTTP vira ApiError com o status: a tela separa senha errada (401),
// bloqueio por excesso de tentativas (429) e sistema fora do ar (5xx) — ver
// lib/login-error.ts. Sem resposta nenhuma (sem internet), o fetch rejeita.
// Não passa pelo apiFetch: um 401 aqui é senha errada, não sessão vencida.
export async function authenticateUser(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.error ?? `HTTP ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  if (typeof data?.token !== 'string') throw new ApiError(502, 'Resposta sem token');
  return data.token;
}

// Troca um token ainda válido por um novo (POST /auth/refresh). Sem corpo e sem
// Content-Type: o Fastify recusa JSON vazio. Não passa pelo apiFetch de
// propósito — um 401 aqui não deve mandar para o login.
export async function refreshAuthToken(token: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (typeof data?.token !== 'string') throw new Error('Resposta sem token');
  return data.token;
}
