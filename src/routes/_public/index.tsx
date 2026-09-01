import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Autoplay from 'embla-carousel-autoplay'
import { StatsSection } from '@/components/home-static-section'
import { HeroSection } from '@/components/home-hero-section'
import { CotacoesSection } from '@/components/home-cotacoes-section'
import { CoursesSection } from '@/components/home-courses-section'
import { HomeNewsSection } from '@/components/home-news-section'
import { usePartners } from '@/hooks/useAdmin'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_public/')({
  component: HomePage,
})

function PartnerItem({ partner }: { partner: { id: string; name: string; partnerLogoUrl: string | null; partnerUrl: string | null } }) {
  const inner = partner.partnerLogoUrl ? (
    <img
      src={partner.partnerLogoUrl}
      alt={partner.name}
      className="h-10 w-auto max-w-35 object-contain md:h-12 md:max-w-40"
    />
  ) : (
    <span className="text-sm font-semibold text-muted-foreground">
      {partner.name}
    </span>
  )

  if (partner.partnerUrl) {
    return (
      <a
        href={partner.partnerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={partner.name}
        className="flex shrink-0 items-center px-8"
      >
        {inner}
      </a>
    )
  }

  return (
    <div title={partner.name} className="flex shrink-0 items-center px-8">
      {inner}
    </div>
  )
}

function PartnersSection() {
  const { t } = useTranslation()
  const { data: partners, isLoading } = usePartners()
  const trackRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    if (!trackRef.current || !wrapperRef.current) return
    const trackW = trackRef.current.scrollWidth / 2
    const wrapperW = wrapperRef.current.offsetWidth
    setShouldScroll(trackW > wrapperW)
  }, [partners])

  if (isLoading) {
    return (
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <Skeleton className="h-5 w-44 mx-auto mb-10" />
          <div className="flex items-center justify-center gap-12">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!partners || partners.length === 0) return null

  return (
    <section className="py-14 md:py-20 bg-white overflow-hidden">
      <style>{`
        @keyframes partners-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .partners-track-scroll {
          animation: partners-marquee 28s linear infinite;
        }
        .partners-track-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4 mb-10">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('home.partnersTitle')}
        </p>
      </div>

      <div ref={wrapperRef} className="relative w-full overflow-hidden">
        {shouldScroll ? (
          <div ref={trackRef} className={`flex w-max partners-track-scroll`}>
            {partners.map(p => <PartnerItem key={p.id} partner={p} />)}
            {partners.map(p => <PartnerItem key={`dup-${p.id}`} partner={p} />)}
          </div>
        ) : (
          <div ref={trackRef} className="flex items-center justify-center flex-wrap gap-10 md:gap-16 w-full">
            {partners.map(p => <PartnerItem key={p.id} partner={p} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function HomePage() {
  const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }))

  return (
    <div className="bg-background">
      <HeroSection />
      <CotacoesSection />
      <StatsSection />
      <CoursesSection autoplayPlugin={autoplayPlugin} />
      <HomeNewsSection />
      <PartnersSection />
    </div>
  )
}
