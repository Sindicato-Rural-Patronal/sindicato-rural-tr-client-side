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
import { reloadForNewChunks } from '@/lib/chunk-reload'
import { isAdminPath, readStoredTheme, syncTheme } from '@/lib/theme'
import { areaForPath, setArea } from '@/lib/area'
import './index.css';
import './i18n';

// Aplica o tema salvo antes do render (evita flash claro→escuro). Cinza e Verde-claro só
// valem no painel (/admin), ver lib/theme.ts; o layout do painel cuida das trocas de tela.
syncTheme(isAdminPath(window.location.pathname))
// Cores de papel no site, neutras no painel (lib/area.ts), também antes do primeiro desenho.
setArea(areaForPath(window.location.pathname))
// No modo "sistema", acompanha mudanças do SO ao vivo.
try {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readStoredTheme() === 'system') {
      syncTheme(isAdminPath(window.location.pathname))
      window.dispatchEvent(new Event('themechange'))
    }
  })
} catch { /* ignore */ }

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