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
