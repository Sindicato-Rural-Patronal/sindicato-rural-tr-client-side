import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight, BookOpen, List, Printer, Search, SearchX, X } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import {
  HELP_ARTICLES, articleSections, filterArticles, groupArticles, relatedArticles, searchExcerpt,
  slug, visibleArticles, type HelpArticle,
} from '@/lib/help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'

type Props = {
  topico?: string
  q?: string
  onChange: (next: { topico?: string; q?: string }) => void
}

/**
 * O texto dos artigos (markdown) nos tokens do tema: as cores do `prose` viram as do
 * painel, e valem sozinhas no tema escuro (sem `prose-invert`). Citação é um quadro
 * neutro, sem itálico nem aspas (nos artigos ela é dica ou aviso, não citação), e o
 * código não leva as crases em volta.
 */
const PROSE = cn(
  'prose prose-sm max-w-none',
  '[--tw-prose-body:var(--muted-foreground)] [--tw-prose-headings:var(--foreground)]',
  '[--tw-prose-bold:var(--foreground)] [--tw-prose-links:var(--primary)]',
  '[--tw-prose-bullets:var(--faint-foreground)] [--tw-prose-counters:var(--faint-foreground)]',
  '[--tw-prose-hr:var(--border)] [--tw-prose-th-borders:var(--border)] [--tw-prose-td-borders:var(--border)]',
  '[--tw-prose-quotes:var(--muted-foreground)] [--tw-prose-quote-borders:var(--border)] [--tw-prose-code:var(--foreground)]',
  'prose-headings:font-semibold prose-a:underline-offset-2',
  'prose-blockquote:rounded-lg prose-blockquote:border-0 prose-blockquote:bg-muted prose-blockquote:px-4 prose-blockquote:py-1',
  'prose-blockquote:font-normal prose-blockquote:not-italic',
  '[&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none',
  'prose-code:rounded-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal',
  '[&_code]:before:content-none [&_code]:after:content-none',
)

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

/**
 * A Central de Ajuda. No computador (a partir de 1024 px), o índice e o artigo ficam lado
 * a lado. Abaixo disso a tela mostra uma coisa por vez: sem artigo, o índice; com um
 * artigo escolhido (`?topico=`), o artigo primeiro, com "← Voltar ao índice" em cima.
 * Antes o artigo ficava embaixo do índice inteiro, e no celular quem tocava num assunto
 * não via nada mudar.
 */
export function HelpPage({ topico, q, onChange }: Props) {
  const { can, isLoading } = usePermissions()
  // O campo responde na hora; a URL guarda o que foi digitado.
  const [draft, setDraft] = useState(q ?? '')
  const campoBusca = useRef<HTMLInputElement>(null)

  const mine = useMemo(() => (isLoading ? [] : visibleArticles(HELP_ARTICLES, can)), [isLoading, can])
  const found = useMemo(() => filterArticles(mine, draft), [mine, draft])
  const current = topico ? mine.find(a => a.id === topico) : undefined
  // Do tablet para baixo, com um artigo aberto, só ele fica na tela.
  const soNoComputador = current ? 'max-lg:hidden' : undefined

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
    <PageContainer>
      <PageHeader
        title="Ajuda"
        description="Como usar o painel, tela por tela. Escrito para quem está começando."
        // O "Imprimir tudo" some no celular com um artigo aberto; sem o espaço da vaga dele.
        className={current ? 'max-lg:gap-0' : undefined}
        actions={
          // Internet caindo, computador do balcão ocupado: o manual na gaveta
          // resolve. Sai só o que esta pessoa pode ver. Com um artigo aberto no
          // celular, o "Imprimir" do próprio artigo basta.
          <Button
            variant="outline"
            onClick={() => setImprimindoTudo(true)}
            disabled={isLoading || mine.length === 0}
            className={cn('print:hidden', soNoComputador)}
          >
            <Printer aria-hidden /> Imprimir tudo
          </Button>
        }
      />

      <div className={cn('relative w-full max-w-lg print:hidden', soNoComputador)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
        <Input
          ref={campoBusca}
          value={draft}
          onChange={e => search(e.target.value)}
          // Curto o bastante para caber inteiro no celular (390 px).
          placeholder="Buscar na ajuda (ex.: banner, senha)…"
          aria-label="Buscar na ajuda"
          className="pl-9 pr-10"
        />
        {draft
          ? (
            <button
              type="button"
              onClick={() => search('')}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          )
          : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-sm border border-border px-1.5 text-xs leading-5 font-medium text-muted-foreground lg:block">
              /
            </kbd>
          )}
      </div>

      {isLoading
        ? <HelpSkeleton />
        : (
          <div className={cn('grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]', imprimindoTudo && 'print:hidden')}>
            <HelpNav articles={found} currentId={current?.id} q={draft} onClear={() => search('')} className={soNoComputador} />
            <div className={cn('min-w-0', !current && 'max-lg:hidden')}>
              {current
                ? (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/admin/ajuda"
                      search={{ q: draft || undefined }}
                      className="-ml-0.5 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden print:hidden"
                    >
                      <ArrowLeft className="size-4" aria-hidden /> Voltar ao índice
                    </Link>
                    <HelpArticleView article={current} visible={mine} q={draft} />
                  </div>
                )
                : <HelpWelcome articles={found} q={draft} />}
            </div>
          </div>
        )}

      {imprimindoTudo && <ManualCompleto articles={mine} />}
    </PageContainer>
  )
}

/** Todos os artigos em sequência, só para a impressão (na tela não aparece). */
function ManualCompleto({ articles }: { articles: HelpArticle[] }) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-semibold text-foreground">Manual do Painel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sindicato Rural de Terra Roxa — impresso em {hoje}. Contém os {articles.length} assuntos
        liberados para este acesso; outro administrador pode ter mais ou menos.
      </p>

      {groupArticles(articles).map(group => (
        <section key={group.id}>
          {group.articles.map(article => (
            <article key={article.id} className="mt-8" style={{ breakBefore: 'page' }}>
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <h2 className="text-xl font-semibold text-foreground">{article.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
              <div className={cn(PROSE, 'mt-3')}>
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
      <Skeleton className="hidden h-64 w-full rounded-xl lg:block" />
    </div>
  )
}

function HelpNav({ articles, currentId, q, onClear, className }: {
  articles: HelpArticle[]
  currentId?: string
  q: string
  onClear: () => void
  className?: string
}) {
  const groups = groupArticles(articles)

  if (groups.length === 0) {
    return (
      <div className={cn('lg:self-start print:hidden', className)}>
        <EmptyState
          framed
          icon={SearchX}
          title={`Nada encontrado para "${q}"`}
          description="Tente uma palavra só, ou outra parecida: a busca não diferencia acento nem maiúscula."
          action={<Button variant="outline" size="sm" onClick={onClear}>Limpar busca</Button>}
          className="py-8"
        />
      </div>
    )
  }

  return (
    <nav aria-label="Assuntos da ajuda" className={cn('flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start print:hidden', className)}>
      {groups.map(group => (
        <div key={group.id}>
          <h2 className="mb-1 px-3 text-xs font-medium text-muted-foreground">{group.label}</h2>
          <ul className="flex flex-col gap-0.5">
            {group.articles.map(article => {
              // Buscando, mostra POR QUE o artigo apareceu — só o título não diz.
              const trecho = q ? searchExcerpt(article, q) : null
              const atual = article.id === currentId
              return (
                <li key={article.id}>
                  <Link
                    to="/admin/ajuda"
                    search={{ topico: article.id, q: q || undefined }}
                    aria-current={atual ? 'page' : undefined}
                    className={cn(
                      // 44 px no toque, 36 px no computador (o mesmo item do menu lateral).
                      'flex min-h-11 flex-col justify-center rounded-md px-3 py-2 text-sm transition-colors lg:min-h-9 lg:py-1.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      atual
                        ? 'bg-card font-medium text-foreground shadow-xs ring-1 ring-border'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span>{article.title}</span>
                    {trecho && (
                      <span className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">{trecho}</span>
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
    <div className="rounded-xl border border-border bg-card p-6">
      <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BookOpen className="size-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-foreground">
        {q ? `${articles.length} ${articles.length === 1 ? 'assunto encontrado' : 'assuntos encontrados'}` : 'Escolha um assunto ao lado'}
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {q
          ? 'Clique em um deles na lista ao lado para abrir.'
          : (
            <>
              São {articles.length} assuntos — só os das telas que a sua permissão libera. Se você é
              novo(a) por aqui, comece por <strong className="font-medium text-foreground">Como funciona o painel</strong>.
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
    <article className="rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl leading-7 font-semibold text-balance text-foreground">{article.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
        </div>
        {/* No celular, só o ícone: o título e o resumo precisam da largura. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          aria-label="Imprimir este artigo"
          title="Imprimir este artigo"
          className="shrink-0 max-sm:size-11 max-sm:px-0 print:hidden"
        >
          <Printer aria-hidden /> <span className="max-sm:hidden">Imprimir</span>
        </Button>
      </div>

      {/* Artigo comprido: os títulos das seções, para ir direto ao que interessa. */}
      {secoes.length >= 3 && (
        <nav aria-label="Nesta página" className="mb-6 rounded-lg bg-muted p-3 print:hidden">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <List className="size-3.5" aria-hidden /> Nesta página
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {secoes.map(secao => (
              <li key={secao.id}>
                <a href={`#${secao.id}`} className="text-sm text-primary underline-offset-2 hover:underline">
                  {secao.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className={PROSE}>
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
        <footer className="mt-6 border-t border-border pt-4 print:hidden">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Ver também</h3>
          <ul className="flex flex-col gap-1">
            {veja.map(outro => (
              <li key={outro.id}>
                <Link
                  to="/admin/ajuda"
                  search={{ topico: outro.id, q: q || undefined }}
                  className="group inline-flex min-h-9 items-baseline gap-1.5 py-1 text-sm"
                >
                  <ArrowRight className="size-3.5 shrink-0 self-center text-primary" aria-hidden />
                  <span>
                    {/* Só o título sublinha: o sublinhado do link passaria também pelo resumo. */}
                    <span className="text-primary underline-offset-2 group-hover:underline">{outro.title}</span>
                    <span className="text-muted-foreground"> — {outro.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  )
}
