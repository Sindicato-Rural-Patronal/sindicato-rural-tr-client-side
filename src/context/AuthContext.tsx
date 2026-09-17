import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { API_BASE } from '@/lib/api';
import { shouldRenewToken } from '@/lib/auth-token';
import { refreshAuthToken } from '@/hooks/use-users';

interface AuthContextType {
  token: string | null;
  baseUrl: string;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const baseUrl = API_BASE;

  const login = useCallback((newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
  }, []);

  const value = useMemo(() => ({ token, baseUrl, login, logout }), [token, baseUrl, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Intervalo mínimo entre duas conferências do token por atividade do usuário.
const RENEW_CHECK_INTERVAL_MS = 30_000;

// Uma renovação por vez (várias abas/cliques seguidos usam a mesma).
let renewInFlight: Promise<string | null> | null = null;

function renewToken(current: string): Promise<string | null> {
  if (!renewInFlight) {
    renewInFlight = refreshAuthToken(current)
      // Falhou (sem rede, 401, 429): não faz nada. Se o token vencer de
      // verdade, o próximo 401 leva ao login guardando a tela atual.
      .catch(() => null)
      .finally(() => {
        renewInFlight = null;
      });
  }
  return renewInFlight;
}

// Renovação deslizante da sessão enquanto o painel está aberto: a cada clique
// ou tecla (no máximo a cada 30s) confere o token e, se já passou da metade da
// validade, troca por um novo. Quem mexe no painel não é deslogado no meio do
// trabalho; só expira depois de horas parado.
export function useSessionRenewal() {
  const { login } = useAuth();

  useEffect(() => {
    let lastCheck = 0;

    function onActivity() {
      const now = Date.now();
      if (now - lastCheck < RENEW_CHECK_INTERVAL_MS) return;
      lastCheck = now;
      const current = localStorage.getItem('token');
      if (!current || !shouldRenewToken(current, now)) return;
      renewToken(current).then(next => {
        // Só grava se ninguém trocou o token enquanto isso (logout, outro login).
        if (next && localStorage.getItem('token') === current) login(next);
      });
    }

    window.addEventListener('pointerdown', onActivity, { capture: true, passive: true });
    window.addEventListener('keydown', onActivity, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', onActivity, { capture: true });
      window.removeEventListener('keydown', onActivity, { capture: true });
    };
  }, [login]);
}
