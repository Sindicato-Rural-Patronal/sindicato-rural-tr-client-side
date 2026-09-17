import { API_BASE } from '@/lib/api'

export async function authenticateUser(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Usuário ou senha inválidos');
  }

  const data = await response.json();
  return data.token as string;
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
