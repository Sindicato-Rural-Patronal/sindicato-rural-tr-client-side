import { createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Autoplay from 'embla-carousel-autoplay'
import { StatsSection } from '@/components/home-static-section'
import { HeroSection } from '@/components/home-hero-section'
import { CoursesSection } from '@/components/home-courses-section'
import { HomeNewsSection } from '@/components/home-news-section'

const partners = [
  { name: 'Prefeitura de Terra Roxa' },
  { name: 'Agroampim' },
  { name: 'I. Riedi' },
  { name: 'C-Vale' },
  { name: 'DNA Rural' },
  { name: 'Disam' },
  { name: 'IDR-Parana' },
]

export const Route = createFileRoute('/_public/')({
  component: HomePage,
})

function HomePage() {
  const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }))
  const { t } = useTranslation()

  return (
    <div className="bg-background">
      <HeroSection />
      <StatsSection />
      <CoursesSection autoplayPlugin={autoplayPlugin} />

      <HomeNewsSection />

      {/* Partners Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-primary md:text-3xl">
            {t('home.partnersTitle')}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {partners.map((partner, i) => (
              <div
                key={i}
                className="flex h-14 w-28 items-center justify-center rounded-lg border bg-card p-3 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0 hover:shadow md:h-16 md:w-32"
              >
                <span className="text-center text-xs font-medium text-muted-foreground">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
