import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { queryClient } from './lib/query-client.ts'; // Importa o cliente de consulta 
import { QueryClientProvider } from '@tanstack/react-query'; // Importa o provedor de consulta  
import { routeTree } from './routeTree.gen.ts'; // Arquivo gerado automaticamente
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Importa as ferramentas de desenvolvimento do React Query
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'
import './index.css';
import './i18n';

// Aplica o tema salvo antes do render (evita flash claro→escuro).
try {
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
} catch {
  /* localStorage indisponível — mantém tema claro padrão */
}

// Cria o roteador com a árvore de rotas
const router = createRouter({ routeTree });

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