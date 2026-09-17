import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, lazyRouteComponent } from '@tanstack/react-router';
import { queryClient } from './lib/query-client.ts'; // Importa o cliente de consulta 
import { QueryClientProvider } from '@tanstack/react-query'; // Importa o provedor de consulta  
import { routeTree } from './routeTree.gen.ts'; // Arquivo gerado automaticamente
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Importa as ferramentas de desenvolvimento do React Query
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'
import { RouteErrorPage } from '@/components/RouteErrorPage'
import { PageLoader } from '@/components/PageLoader'
import './index.css';
import './i18n';

// Aplica o tema salvo antes do render (evita flash claro→escuro).
// 'light' | 'dark' | 'system' (ou ausente = segue o SO).
function applyTheme() {
  try {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark)
    document.documentElement.classList.toggle('dark', !!dark)
  } catch {
    /* localStorage indisponível — mantém tema claro padrão */
  }
}
applyTheme()
// No modo "sistema", acompanha mudanças do SO ao vivo.
try {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const stored = localStorage.getItem('theme')
    if (stored === 'system' || !stored) {
      applyTheme()
      window.dispatchEvent(new Event('themechange'))
    }
  })
} catch { /* ignore */ }

// Deploy troca os hashes dos chunks; uma aba aberta pode pedir um chunk que
// não existe mais → import dinâmico falha. Recarrega UMA vez para pegar o
// index/chunks novos. O flag evita loop caso a falha seja real (offline etc).
function reloadForNewChunks() {
  try {
    if (sessionStorage.getItem('chunk-reload') === '1') return
    sessionStorage.setItem('chunk-reload', '1')
  } catch {
    /* sessionStorage indisponível — segue sem guarda */
  }
  window.location.reload()
}
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  reloadForNewChunks()
})

// Cria o roteador com a árvore de rotas. Telas padrão em português para
// endereço inexistente (404), erro ao abrir a página e carregamento lento.
// A 404 (com cabeçalho/rodapé do site) só baixa quando alguém cai nela; erro e
// carregamento ficam no pacote inicial (precisam aparecer mesmo sem internet).
const router = createRouter({
  routeTree,
  defaultNotFoundComponent: lazyRouteComponent(() => import('@/components/NotFoundPage'), 'NotFoundPage'),
  defaultErrorComponent: RouteErrorPage,
  defaultPendingComponent: PageLoader,
});

// Declaração de tipos para TypeScript (opcional, mas recomendada)
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);