import { createFileRoute } from '@tanstack/react-router'
import { safeUrl } from '@/utils/safe-url'
import { useTranslation } from 'react-i18next'
import { HeroSection } from '@/components/home-hero-section'
import { CotacoesSection } from '@/components/home-cotacoes-section'
import { CoursesSection } from '@/components/home-courses-section'
import { HomeEventsSection } from '@/components/home-events-section'
import { HomeNewsSection } from '@/components/home-news-section'
import { usePartners } from '@/hooks/useAdmin'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'

export const Route = createFileRoute('/_public/')({
  component: HomePage,
})

type Partner = { id: string; name: string; partnerLogoUrl: string | null; partnerUrl: string | null }

// Cada parceiro numa célula da grade. Os logos chegam com fundo branco (não
// transparente): a célula é branca para o logo não virar um retângulo dentro
// dela; no tema escuro a célula é a do cartão e o logo fica numa placa branca.
const CELL = 'flex h-20 items-center justify-center rounded-xl border border-border bg-white px-4 md:h-24 dark:bg-card'

function PartnerItem({ partner }: { partner: Partner }) {
  const inner = partner.partnerLogoUrl ? (
    <img
      src={partner.partnerLogoUrl}
      alt={partner.name}
      width={300}
      height={150}
      loading="lazy"
      decoding="async"
      className="max-h-12 w-auto max-w-full object-contain md:max-h-14 dark:rounded-md dark:bg-white dark:px-2 dark:py-1"
    />
  ) : (
    <span className="text-center text-sm font-medium text-muted-foreground">{partner.name}</span>
  )

  if (partner.partnerUrl) {
    return (
      <a
        href={safeUrl(partner.partnerUrl)}
        target="_blank"
        rel="noopener noreferrer"
        title={partner.name}
        className={`${CELL} transition-colors hover:border-foreground/25`}
      >
        {inner}
      </a>
    )
  }

  return (
    <div title={partner.name} className={CELL}>
      {inner}
    </div>
  )
}

// Parada, em grade: antes a faixa rolava sozinha.
function PartnersSection() {
  const { t } = useTranslation()
  const { data: partners, isLoading, isError, isFetching, refetch } = usePartners()

  if (isLoading) {
    return (
      <section className="border-t border-border py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="mb-6 h-6 w-32" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl md:h-24" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Faixa opcional: sem parceiros ela não existe; falha vira uma linha com
  // "Tentar de novo", não um sumiço calado.
  if (isError && !partners) {
    return (
      <LoadErrorRetry variant="inline" className="container mx-auto justify-center px-4 py-8" onRetry={() => void refetch()} retrying={isFetching} />
    )
  }

  if (!partners || partners.length === 0) return null

  return (
    <section className="border-t border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-6 text-xl font-semibold text-foreground md:text-2xl">{t('home.partnersTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {partners.map(p => <PartnerItem key={p.id} partner={p} />)}
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <div className="bg-background">
      <HeroSection />
      <CoursesSection />
      <HomeEventsSection />
      <CotacoesSection />
      <HomeNewsSection />
      <PartnersSection />
    </div>
  )
}
