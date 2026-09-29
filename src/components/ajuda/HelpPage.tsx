import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight, BookOpen, HelpCircle, List, Printer, Search, X } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import {
  HELP_ARTICLES, articleSections, filterArticles, groupArticles, relatedArticles, searchExcerpt,
  slug, visibleArticles, type HelpArticle,
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

/** O texto de dentro de um título, para virar âncora. */
function textoDe(children: React.ReactNode): string {
  return Children.toArray(children)
    .map(filho => {
      if (typeof filho === 'string' || typeof filho === 'number') return String(filho)
      if (isValidElement<{ children?: React.ReactNode }>(filho)) return textoDe(filho.props.children)
      return ''
    })
    .join('')
}

export function HelpPage({ topico, q, onChange }: Props) {
  const { can, isLoading } = usePermissions()
  // O campo responde na hora; a URL guarda o que foi digitado.
  const [draft, setDraft] = useState(q ?? '')
  const campoBusca = useRef<HTMLInputElement>(null)

  const mine = useMemo(() => (isLoading ? [] : visibleArticles(HELP_ARTICLES, can)), [isLoading, can])
  const found = useMemo(() => filterArticles(mine, draft), [mine, draft])
  const current = topico ? mine.find(a => a.id === topico) : undefined

  // "/" leva ao campo de busca, como na maioria dos sites de ajuda.
  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null
      const digitando = alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.isContentEditable
      if (e.key !== '/' || digitando || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      campoBusca.current?.focus()
      campoBusca.current?.select()
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  // Manual inteiro: fica fora da tela e só existe no papel. A impressão abre
  // depois que o navegador desenhou os artigos (daí os dois quadros de espera).
  const [imprimindoTudo, setImprimindoTudo] = useState(false)
  useEffect(() => {
    if (!imprimindoTudo) return
    let quadro = 0
    const primeiro = requestAnimationFrame(() => {
      quadro = requestAnimationFrame(() => {
        window.print()
        setImprimindoTudo(false)
      })
    })
    return () => {
      cancelAnimationFrame(primeiro)
      cancelAnimationFrame(quadro)
    }
  }, [imprimindoTudo])

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

      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={campoBusca}
            value={draft}
            onChange={e => search(e.target.value)}
            placeholder="Buscar na ajuda (ex.: banner, cotação, senha)…"
            aria-label="Buscar na ajuda"
            className="pl-9 pr-9"
          />
          {draft
            ? (
              <button
                type="button"
                onClick={() => search('')}
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )
            : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:block">
                /
              </kbd>
            )}
        </div>

        {/* Internet caindo, computador do balcão ocupado: o manual na gaveta
            resolve. Sai só o que esta pessoa pode ver. */}
        <Button
          variant="outline"
          onClick={() => setImprimindoTudo(true)}
          disabled={isLoading || mine.length === 0}
          className="h-11 gap-2"
        >
          <Printer className="size-4" aria-hidden /> Imprimir tudo
        </Button>
      </div>

      {isLoading
        ? <HelpSkeleton />
        : (
          <div className={cn('grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]', imprimindoTudo && 'print:hidden')}>
            <HelpNav articles={found} currentId={current?.id} q={draft} />
            <div className={cn('min-w-0', current ? '' : 'hidden lg:block')}>
              {current
                ? <HelpArticleView article={current} visible={mine} q={draft} />
                : <HelpWelcome articles={found} q={draft} />}
            </div>
          </div>
        )}

      {imprimindoTudo && <ManualCompleto articles={mine} />}
    </div>
  )
}

/** Todos os artigos em sequência, só para a impressão (na tela não aparece). */
function ManualCompleto({ articles }: { articles: HelpArticle[] }) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-bold text-foreground">Manual do Painel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sindicato Rural de Terra Roxa — impresso em {hoje}. Contém os {articles.length} assuntos
        liberados para este acesso; outro administrador pode ter mais ou menos.
      </p>

      {groupArticles(articles).map(group => (
        <section key={group.id}>
          {group.articles.map(article => (
            <article key={article.id} className="mt-8" style={{ breakBefore: 'page' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <h2 className="text-xl font-bold text-foreground">{article.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
              <div className="prose prose-sm mt-3 max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-th:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
              </div>
            </article>
          ))}
        </section>
      ))}
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
            {group.articles.map(article => {
              // Buscando, mostra POR QUE o artigo apareceu — só o título não diz.
              const trecho = q ? searchExcerpt(article, q) : null
              return (
                <li key={article.id}>
                  <Link
                    to="/admin/ajuda"
                    search={{ topico: article.id, q: q || undefined }}
                    className={cn(
                      'flex min-h-11 flex-col justify-center rounded-lg px-3 py-2 text-sm transition-colors',
                      article.id === currentId
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <span>{article.title}</span>
                    {trecho && (
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">{trecho}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function HelpWelcome({ articles, q }: { articles: HelpArticle[]; q: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <BookOpen className="mb-3 size-6 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">
        {q ? `${articles.length} ${articles.length === 1 ? 'assunto encontrado' : 'assuntos encontrados'}` : 'Escolha um assunto ao lado'}
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {q
          ? 'Clique em um deles na lista ao lado para abrir.'
          : (
            <>
              São {articles.length} assuntos — só os das telas que a sua permissão libera. Se você é
              novo(a) por aqui, comece por <strong>Como funciona o painel</strong>.
            </>
          )}
      </p>
    </div>
  )
}

function HelpArticleView({ article, visible, q }: {
  article: HelpArticle
  visible: HelpArticle[]
  q: string
}) {
  const navigate = useNavigate()
  const secoes = articleSections(article.body)
  const veja = relatedArticles(article, visible)

  function abrir(topico: string) {
    navigate({ to: '/admin/ajuda', search: { topico, q: q || undefined } })
  }

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

      {/* Artigo comprido: os títulos das seções, para ir direto ao que interessa. */}
      {secoes.length >= 3 && (
        <nav aria-label="Nesta página" className="mb-5 rounded-lg border border-border bg-muted/30 p-3 print:hidden">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <List className="size-3.5" aria-hidden /> Nesta página
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {secoes.map(secao => (
              <li key={secao.id}>
                <a href={`#${secao.id}`} className="text-sm text-primary hover:underline">
                  {secao.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-primary prose-th:text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Título ganha âncora para o "Nesta página" conseguir chegar nele.
            h2: ({ children, ...rest }) => (
              <h2 id={slug(textoDe(children))} className="scroll-mt-4" {...rest}>{children}</h2>
            ),
            // "?topico=outro-artigo" anda dentro da ajuda em vez de recarregar a página.
            a: ({ href, children, ...rest }) => {
              const topico = href?.startsWith('?topico=') ? href.slice('?topico='.length) : null
              if (!topico) {
                const interno = href?.startsWith('#')
                return <a href={href} target={interno ? undefined : '_blank'} rel={interno ? undefined : 'noreferrer'} {...rest}>{children}</a>
              }
              return (
                <a
                  href={href}
                  onClick={e => {
                    e.preventDefault()
                    abrir(topico)
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

      {veja.length > 0 && (
        <footer className="mt-6 border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ver também
          </h3>
          <ul className="flex flex-col gap-1">
            {veja.map(outro => (
              <li key={outro.id}>
                <Link
                  to="/admin/ajuda"
                  search={{ topico: outro.id, q: q || undefined }}
                  className="group inline-flex min-h-9 items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  {outro.title}
                  <span className="text-muted-foreground group-hover:no-underline">— {outro.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  )
}
