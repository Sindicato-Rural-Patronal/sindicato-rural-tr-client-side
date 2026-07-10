import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useNewsDetail } from '@/hooks/useNews'
import { parseBlocks } from '@/@types/news'
import type { ContentBlock } from '@/@types/news'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Newspaper } from 'lucide-react'

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
        className="w-full rounded-xl object-cover max-h-[480px]"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground italic">
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
}: {
  url: string
  text: string
  imagePosition: 'left' | 'right'
}) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-start ${
        imagePosition === 'right' ? 'md:flex-row-reverse' : ''
      }`}
    >
      <img
        src={url}
        alt=""
        className="w-full md:w-2/5 rounded-xl object-cover max-h-64"
      />
      <p className="flex-1 min-w-0 text-base leading-relaxed text-foreground/90 whitespace-pre-line wrap-break-word">
        {text}
      </p>
    </div>
  )
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === 'paragraph') return <ParagraphBlock text={block.text} />
  if (block.type === 'image') return <ImageBlock url={block.url} caption={block.caption} />
  if (block.type === 'image-text')
    return (
      <ImageTextBlock
        url={block.url}
        text={block.text}
        imagePosition={block.imagePosition}
      />
    )
  return null
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { t } = useTranslation()
  const { data: news, isLoading, isError } = useNewsDetail(id)

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

  if (isError || !news) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <Newspaper className="mx-auto size-16 text-muted-foreground/40" />
        <h2 className="mt-4 text-xl font-semibold">{t('newsPage.notFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('newsPage.notFoundHint')}</p>
        <Button asChild className="mt-6">
          <Link to="/noticias">{t('newsPage.backToNews')}</Link>
        </Button>
      </main>
    )
  }

  const date = news.publishedAt
    ? new Date(news.publishedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

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

      {news.bannerUrl && (
        <div className="mb-6 overflow-hidden rounded-xl">
          <img
            src={news.bannerUrl}
            alt={news.title}
            className="w-full max-h-80 object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight md:text-3xl wrap-break-word">{news.title}</h1>
        {date && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('newsPage.publishedAt')}{date}
          </p>
        )}
        {news.summary && (
          <p className="mt-4 text-base text-muted-foreground leading-relaxed border-l-4 border-primary pl-4 italic wrap-break-word">
            {news.summary}
          </p>
        )}
      </header>

      <article className="space-y-6">
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </article>
    </main>
  )
}
