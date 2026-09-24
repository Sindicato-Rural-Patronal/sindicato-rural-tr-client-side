import { createFileRoute } from '@tanstack/react-router'
import { CotacaoSimples } from '@/components/cotacoes/CotacaoSimples'

// Fora do layout `_public` de propósito: esta é a tela para mandar em grupo,
// e menu e rodapé só atrapalhariam quem abre o link no celular.
export const Route = createFileRoute('/cotacao')({
  component: CotacaoSimples,
})
