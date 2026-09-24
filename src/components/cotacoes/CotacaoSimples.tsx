import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, Check, Copy, MessageCircle, RefreshCw } from 'lucide-react'
import { useMarketQuotes } from '@/hooks/useMarketQuotes'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { QuoteDayCard } from '@/components/cotacoes/QuoteDayCard'
import {
  diaDaCotacao, resumoDaCotacao, textoDaCotacao, whatsappDaCotacao,
} from '@/lib/cotacao-compartilhar'
import { copyText } from '@/lib/copy-text'

// Tela enxuta das cotações do dia, feita para ser mandada em grupo. Sem menu,
// sem rodapé e sem histórico: quem abre o link no celular, no meio de um
// leilão, quer ver o preço e fechar. O resto do site fica a um toque de
// distância, no fim da página.

export function CotacaoSimples() {
  const { data, isLoading, isError, isFetching, refetch } = useMarketQuotes()
  const { data: settings } = usePublicSiteSettings()
  const quotes = data ?? []
  const dia = diaDaCotacao(quotes)
  const [copiado, setCopiado] = useState(false)

  useSeo({
    title: dia ? `Cotações de ${dia}` : 'Cotações do dia',
    description: quotes.length > 0
      ? resumoDaCotacao(quotes)
      : 'Cotações de soja, milho, trigo, mandioca e dólar do Sindicato Rural de Terra Roxa.',
  })

  const texto = textoDaCotacao(quotes, {
    fonte: settings?.quotesSource,
    link: typeof window !== 'undefined' ? window.location.href : null,
  })

  async function copiar() {
    if (await copyText(texto)) {
      setCopiado(true)
      toast.success('Cotações copiadas. É só colar no grupo.')
      setTimeout(() => setCopiado(false), 2500)
    } else {
      toast.error('Não foi possível copiar. Selecione o texto e copie à mão.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 py-6">
      <header className="text-center">
        <img src="/logo-full.png" alt="Sindicato Rural de Terra Roxa" className="mx-auto h-12 object-contain" />
        <h1 className="mt-3 text-xl font-bold text-foreground">Cotações do dia</h1>
        {dia && <p className="text-sm text-muted-foreground">{dia}</p>}
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {isError && quotes.length === 0 && (
        <LoadErrorRetry hint onRetry={() => void refetch()} retrying={isFetching} className="rounded-xl border bg-card" />
      )}

      {!isLoading && !isError && quotes.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma cotação lançada ainda.
        </p>
      )}

      {quotes.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {quotes.map(q => <QuoteDayCard key={q.id} quote={q} />)}
          </div>

          {settings?.quotesSource?.trim() && (
            <p className="text-center text-xs text-muted-foreground">Fonte: {settings.quotesSource}</p>
          )}

          {/* Mandar no grupo: o texto colado é o que a maioria usa, então ele
              vem primeiro e com o botão cheio. */}
          <div className="flex flex-col gap-2">
            <Button onClick={() => void copiar()} className="h-12 w-full gap-2 text-base">
              {copiado ? <Check className="size-5" /> : <Copy className="size-5" />}
              {copiado ? 'Copiado!' : 'Copiar para o grupo'}
            </Button>
            <Button asChild variant="outline" className="h-12 w-full gap-2 text-base">
              <a href={whatsappDaCotacao(texto)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-5" /> Enviar pelo WhatsApp
              </a>
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full gap-2 text-sm text-muted-foreground"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </>
      )}

      <footer className="mt-auto pt-4 text-center">
        <Link
          to="/cotacoes"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver histórico de preços <ArrowRight className="size-4" />
        </Link>
        <p className="mt-1">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">
            Site do Sindicato Rural de Terra Roxa
          </Link>
        </p>
      </footer>
    </main>
  )
}
