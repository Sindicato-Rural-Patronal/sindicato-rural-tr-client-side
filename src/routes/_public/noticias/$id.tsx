import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useNewsDetail } from '@/hooks/useNews'
import { useSeo } from '@/hooks/useSeo'
import { parseBlocks } from '@/@types/news'
import type { ContentBlock } from '@/@types/news'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { errorStatus } from '@/lib/query-retry'

export const Route = createFileRoute('/_public/noticias/$id')({
  component: RouteComponent,
})

function ParagraphBlock({ text }: { text: string }) {
  return (
    <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line wrap-break-word">
      {text}
    </p>
  )
}

function ImageBlock({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="my-2">
      <img
        src={url}
        alt={caption ?? ''}
        loading="lazy"
        decoding="async"
        className="mx-auto block h-auto max-h-[480px] w-auto max-w-full rounded-xl border border-border"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function ImageTextBlock({
  url,
  text,
  imagePosition,
  newsTitle,
}: {
  url: string
  text: string
  imagePosition: 'left' | 'right'
  newsTitle: string
}) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-start ${
        imagePosition === 'right' ? 'md:flex-row-reverse' : ''
      }`}
    >
      <img
        src={url}
        alt={text.trim() || newsTitle}
        loading="lazy"
        decoding="async"
        className="max-h-64 w-full rounded-xl border border-border object-cover md:w-2/5"
      />
      <p className="flex-1 min-w-0 text-base leading-relaxed text-foreground/90 whitespace-pre-line wrap-break-word">
        {text}
      </p>
    </div>
  )
}

function BlockRenderer({ block, newsTitle }: { block: ContentBlock; newsTitle: string }) {
  if (block.type === 'paragraph') return <ParagraphBlock text={block.text} />
  if (block.type === 'image') return <ImageBlock url={block.url} caption={block.caption} />
  if (block.type === 'image-text')
    return (
      <ImageTextBlock
        url={block.url}
        text={block.text}
        imagePosition={block.imagePosition}
        newsTitle={newsTitle}
      />
    )
  return null
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { t } = useTranslation()
  const { data: news, isLoading, isError, error, isFetching, refetch } = useNewsDetail(id)

  useSeo({
    title: news?.title,
    description: news?.summary ?? undefined,
    image: news?.bannerUrl ?? undefined,
  })

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
        <Skeleton className="h-8 w-3/4 mb-3" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </main>
    )
  }

  // Só 404 é "não existe": outra falha (sem internet, servidor fora) pede para tentar de novo.
  if (isError && errorStatus(error) !== 404) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <LoadErrorRetry
          message={t('newsPage.detailLoadError')}
          hint
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
        <div className="flex justify-center">
          <Button asChild variant="link" className="h-11">
            <Link to="/noticias">{t('newsPage.backToNews')}</Link>
          </Button>
        </div>
      </main>
    )
  }

  if (isError || !news) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <Newspaper className="mx-auto size-12 text-faint-foreground" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">{t('newsPage.detailNotFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('newsPage.detailNotFoundDesc')}</p>
        <Button asChild className="mt-6 h-11">
          <Link to="/noticias">{t('newsPage.backToNews')}</Link>
        </Button>
      </main>
    )
  }

  const date = news.publishedAt ? formatDateFromString(news.publishedAt) : null

  const blocks = parseBlocks(news.content)

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/noticias"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        {t('newsPage.backToNews')}
      </Link>

      {/* A imagem é recortada no painel em 1440 × 600: aparece inteira, sem corte. */}
      {news.bannerUrl && (
        <div className="mb-6 aspect-[12/5] overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={news.bannerUrl}
            alt={news.title}
            width={1440}
            height={600}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        {date && (
          <p className="mb-2 text-sm text-muted-foreground">
            {t('newsPage.publishedAt')}<span className="num">{date}</span>
          </p>
        )}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground wrap-break-word md:text-3xl">{news.title}</h1>
        {news.summary && (
          <p className="mt-4 border-l-2 border-primary pl-4 text-lg leading-relaxed text-muted-foreground wrap-break-word">
            {news.summary}
          </p>
        )}
      </header>

      <article className="space-y-6">
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} newsTitle={news.title} />
        ))}
      </article>
    </main>
  )
}
