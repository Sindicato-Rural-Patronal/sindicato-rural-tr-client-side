import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Skeleton } from '@/components/ui/skeleton'
import { QuoteDayCard } from '@/components/cotacoes/QuoteDayCard'
import { diaDaCotacao, resumoDaCotacao } from '@/lib/cotacao-resumo'

// Tela enxuta das cotações do dia, no espírito da página antiga do sindicato
// (ruraltr.com.br/mobile/cotacao.php): logo, data, um cartão por produto e o
// dólar à parte. Sem menu e sem rodapé do site — quem abre o link no celular,
// no meio de um leilão, quer ver o preço e fechar.
//
// Não há botão de copiar nem de compartilhar: para mandar em grupo basta
// copiar o endereço da página.

/** O dólar não é produto agrícola: na página antiga ele fica embaixo, à parte. */
function separaDolar(quotes: readonly MarketQuote[]) {
  return {
    produtos: quotes.filter(q => q.label !== 'DOLAR'),
    dolar: quotes.filter(q => q.label === 'DOLAR'),
  }
}

export function CotacaoSimples() {
  const { data, isError, isFetching, refetch, isLoading } = useMarketQuotes()
  const { data: settings } = usePublicSiteSettings()
  const quotes = data ?? []
  const dia = diaDaCotacao(quotes)
  const { produtos, dolar } = separaDolar(quotes)
  const fonte = settings?.quotesSource?.trim()

  useSeo({
    title: dia ? `Cotações de ${dia}` : 'Cotações do dia',
    description: quotes.length > 0
      ? resumoDaCotacao(quotes)
      : 'Cotações de soja, milho, trigo, mandioca e dólar do Sindicato Rural de Terra Roxa.',
  })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6">
      <header className="text-center">
        <img src="/logo-full.png" alt="Sindicato Rural de Terra Roxa" className="mx-auto h-14 object-contain" />
        <h1 className="mt-4 text-xl font-bold text-foreground">Cotações do dia</h1>
        {dia && <p className="text-sm text-muted-foreground">{dia}</p>}
      </header>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}

        {isError && quotes.length === 0 && (
          <LoadErrorRetry
            hint
            onRetry={() => void refetch()}
            retrying={isFetching}
            className="rounded-xl border bg-card"
          />
        )}

        {!isLoading && !isError && quotes.length === 0 && (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma cotação lançada ainda.
          </p>
        )}

        {produtos.map(q => <QuoteDayCard key={q.id} quote={q} />)}

        {dolar.length > 0 && (
          <section className="mt-3 border-t border-border pt-4">
            <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Moeda
            </h2>
            <div className="flex flex-col gap-3">
              {dolar.map(q => <QuoteDayCard key={q.id} quote={q} />)}
            </div>
          </section>
        )}
      </div>

      {fonte && <p className="mt-4 text-center text-xs text-muted-foreground">Fonte: {fonte}</p>}

      <footer className="mt-auto flex flex-col items-center gap-3 pt-8">
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/cotacoes"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-primary hover:bg-accent"
          >
            Histórico de cotações <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/cursos"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-primary hover:bg-accent"
          >
            <BookOpen className="size-4" /> Cursos
          </Link>
        </div>
        {/* Aqui era a marca horizontal (logo-icon.png): ela tem texto
            verde-escuro em fundo transparente e sumia no tema escuro. O emblema
            redondo do topo já identifica o sindicato, então o pé leva um link
            escrito, que funciona nos dois temas. */}
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Site do Sindicato Rural de Terra Roxa
        </Link>
      </footer>
    </main>
  )
}
