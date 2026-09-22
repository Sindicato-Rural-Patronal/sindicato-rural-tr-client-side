import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, BookOpen, HelpCircle, Printer, Search, X } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import {
  HELP_ARTICLES, filterArticles, groupArticles, visibleArticles, type HelpArticle,
} from '@/lib/help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Props = {
  topico?: string
  q?: string
  onChange: (next: { topico?: string; q?: string }) => void
}

export function HelpPage({ topico, q, onChange }: Props) {
  const { can, isLoading } = usePermissions()
  // O campo responde na hora; a URL guarda o que foi digitado.
  const [draft, setDraft] = useState(q ?? '')

  const mine = useMemo(() => (isLoading ? [] : visibleArticles(HELP_ARTICLES, can)), [isLoading, can])
  const found = useMemo(() => filterArticles(mine, draft), [mine, draft])
  const current = topico ? mine.find(a => a.id === topico) : undefined

  function search(value: string) {
    setDraft(value)
    onChange({ topico, q: value || undefined })
  }

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <HelpCircle className="size-6" /> Ajuda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Como usar o painel, tela por tela. Escrito para quem está começando.
        </p>
      </header>

      <div className="relative mb-6 max-w-lg print:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={draft}
          onChange={e => search(e.target.value)}
          placeholder="Buscar na ajuda (ex.: banner, cotação, senha)…"
          aria-label="Buscar na ajuda"
          className="pl-9 pr-9"
        />
        {draft && (
          <button
            type="button"
            onClick={() => search('')}
            aria-label="Limpar busca"
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {isLoading
        ? <HelpSkeleton />
        : (
          <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <HelpNav articles={found} currentId={current?.id} q={draft} />
            <div className={cn('min-w-0', current ? '' : 'hidden lg:block')}>
              {current
                ? <HelpArticleView article={current} q={draft} />
                : <HelpWelcome total={found.length} />}
            </div>
          </div>
        )}
    </div>
  )
}

function HelpSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function HelpNav({ articles, currentId, q }: { articles: HelpArticle[]; currentId?: string; q: string }) {
  const groups = groupArticles(articles)

  if (groups.length === 0) {
    return (
      <nav className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Nada encontrado para "{q}".
      </nav>
    )
  }

  return (
    <nav aria-label="Assuntos da ajuda" className="lg:sticky lg:top-4 lg:self-start print:hidden">
      {groups.map(group => (
        <div key={group.id} className="mb-4">
          <h2 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h2>
          <ul className="flex flex-col">
            {group.articles.map(article => (
              <li key={article.id}>
                <Link
                  to="/admin/ajuda"
                  search={{ topico: article.id, q: q || undefined }}
                  className={cn(
                    'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    article.id === currentId
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function HelpWelcome({ total }: { total: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <BookOpen className="mb-3 size-6 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">Escolha um assunto ao lado</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        São {total} {total === 1 ? 'assunto' : 'assuntos'} — só os das telas que a sua permissão
        libera. Se você é novo(a) por aqui, comece por <strong>Como funciona o painel</strong>.
      </p>
    </div>
  )
}

function HelpArticleView({ article, q }: { article: HelpArticle; q: string }) {
  const navigate = useNavigate()

  return (
    <article className="rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/admin/ajuda"
            search={{ q: q || undefined }}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden print:hidden"
          >
            <ArrowLeft className="size-4" /> Assuntos
          </Link>
          <h2 className="text-xl font-bold text-foreground">{article.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="shrink-0 print:hidden"
        >
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-primary prose-th:text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // "?topico=outro-artigo" anda dentro da ajuda em vez de recarregar a página.
            a: ({ href, children, ...rest }) => {
              const topico = href?.startsWith('?topico=') ? href.slice('?topico='.length) : null
              if (!topico) return <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>
              return (
                <a
                  href={href}
                  onClick={e => {
                    e.preventDefault()
                    navigate({ to: '/admin/ajuda', search: { topico, q: q || undefined } })
                  }}
                  {...rest}
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {article.body}
        </ReactMarkdown>
      </div>
    </article>
  )
}
