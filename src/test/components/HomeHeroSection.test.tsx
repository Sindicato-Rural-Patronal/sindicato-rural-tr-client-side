import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { PublicBanner } from '@/hooks/useBanner'
import { BANNER_FALLBACK_TITLE } from '@/lib/banner-layout'
import { HeroSection } from '@/components/home-hero-section'

// Banner da página inicial (SR-155): só o cartaz, no meio, quando não há
// subtítulo nem botões; duas colunas quando há. O título "." nunca aparece.

const h = vi.hoisted(() => ({
  query: { data: undefined as PublicBanner[] | undefined, isLoading: false, isError: false, isFetching: false, refetch: () => {} },
  api: {
    on: () => {}, off: () => {},
    scrollTo: (() => {}) as (i: number) => void,
    selectedScrollSnap: () => 0,
    canScrollPrev: () => true, canScrollNext: () => true,
    scrollPrev: () => {}, scrollNext: () => {},
  },
  autoplayStop: (() => {}) as () => void,
}))

vi.mock('@/hooks/useBanner', () => ({ useBanners: () => h.query }))
// jsdom não mede nada: o Embla vira uma API falsa e o autoplay um plugin vazio.
vi.mock('embla-carousel-react', () => ({ default: () => [() => {}, h.api] }))
vi.mock('embla-carousel-autoplay', () => ({
  default: () => ({ name: 'autoplay', options: {}, init: () => {}, destroy: () => {}, stop: () => h.autoplayStop() }),
}))
type LinkProps = { children?: ReactNode; to?: string; className?: string }
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: LinkProps) => <a href={to} className={className}>{children}</a>,
}))

const IMG = 'https://storage.test/cartaz.jpg'
const soCartaz = (over: Partial<PublicBanner> = {}): PublicBanner => ({
  id: 'a', title: 'DIA DE CAMPO 2026', subtitle: null, imageUrl: IMG, buttons: [], ...over,
})
const comTexto = (over: Partial<PublicBanner> = {}): PublicBanner => ({
  id: 'b', title: 'CURSO DE TRATORISTA', subtitle: 'INSCRICOES ABERTAS', imageUrl: IMG,
  buttons: [{ label: 'VER CURSOS', url: '/cursos', external: false, variant: 'primary' }], ...over,
})

function mostrar(banners: PublicBanner[] | undefined, extra: Partial<typeof h.query> = {}) {
  h.query = { data: banners, isLoading: false, isError: false, isFetching: false, refetch: () => {}, ...extra }
  return render(<HeroSection />)
}

beforeEach(() => {
  h.api.scrollTo = vi.fn()
  h.autoplayStop = vi.fn()
})

describe('HeroSection', () => {
  it('só o cartaz: grande e no meio, com o título só para o leitor de tela', () => {
    const { container } = mostrar([soCartaz()])
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'DIA DE CAMPO 2026')
    const figure = img.closest('figure')!
    expect(figure).toHaveClass('mx-auto', 'max-w-6xl', 'aspect-[12/5]')
    const h1 = screen.getByRole('heading', { level: 1, name: 'DIA DE CAMPO 2026' })
    expect(h1).toHaveClass('sr-only')
    expect(container.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'cartaz')
    // Um banner só: sem setas nem pontos.
    expect(screen.queryByRole('button', { name: 'Próximo aviso' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Escolher aviso' })).toBeNull()
  })

  it('título só com pontuação nunca aparece nem é lido', () => {
    for (const titulo of ['.', '-', '…']) {
      const { container, unmount } = mostrar([soCartaz({ title: titulo })])
      expect(screen.getByRole('img')).toHaveAttribute('alt', BANNER_FALLBACK_TITLE)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(BANNER_FALLBACK_TITLE)
      expect(screen.queryByText(titulo)).toBeNull()
      expect(container.querySelector(`[alt="${titulo}"]`)).toBeNull()
      unmount()
    }
  })

  it('com subtítulo ou botão: o título, o subtítulo e o botão ao lado do cartaz', () => {
    const { container } = mostrar([comTexto()])
    expect(container.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'texto')
    const h1 = screen.getByRole('heading', { level: 1, name: 'CURSO DE TRATORISTA' })
    expect(h1).not.toHaveClass('sr-only')
    expect(screen.getByText('INSCRICOES ABERTAS')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'VER CURSOS' })).toHaveAttribute('href', '/cursos')
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'CURSO DE TRATORISTA: INSCRICOES ABERTAS')
    // Só o botão, sem subtítulo, também é o layout com texto.
    const { container: c2 } = mostrar([comTexto({ id: 'c', subtitle: null })])
    expect(c2.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'texto')
  })

  it('título "." com subtítulo: aparecem o subtítulo e o botão, e o título vira o texto neutro', () => {
    mostrar([comTexto({ title: '.' })])
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(BANNER_FALLBACK_TITLE)
    expect(screen.getByText('INSCRICOES ABERTAS')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('alt', `${BANNER_FALLBACK_TITLE}: INSCRICOES ABERTAS`)
    expect(screen.queryByText('.')).toBeNull()
  })

  it('carrossel misto: setas e pontos uma vez só, embaixo dos slides, e os pontos sem "."', () => {
    const { container } = mostrar([soCartaz({ id: 'a', title: '.' }), comTexto({ id: 'b' })])
    const slides = container.querySelectorAll('[aria-roledescription="slide"]')
    expect(slides).toHaveLength(2)
    expect(within(slides[1] as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent('CURSO DE TRATORISTA')

    const pontos = screen.getByRole('group', { name: 'Escolher aviso' })
    expect(within(pontos).getAllByRole('button').map(b => b.getAttribute('aria-label')))
      .toEqual(['Aviso 1', 'Aviso 2: CURSO DE TRATORISTA'])

    // Fora dos slides, na ordem anterior · pontos · próximo.
    const anterior = screen.getByRole('button', { name: 'Aviso anterior' })
    const proximo = screen.getByRole('button', { name: 'Próximo aviso' })
    const fila = anterior.parentElement!
    expect(fila).toHaveClass('justify-center')
    expect([...fila.children]).toEqual([anterior, pontos, proximo])
    for (const s of slides) expect(s.contains(fila)).toBe(false)

    // Ponto e seta param o autoplay e levam ao aviso.
    fireEvent.click(within(pontos).getByRole('button', { name: /^Aviso 2/ }))
    expect(h.api.scrollTo).toHaveBeenLastCalledWith(1)
    fireEvent.click(anterior)
    expect(h.api.scrollTo).toHaveBeenLastCalledWith(1)
    fireEvent.click(proximo)
    expect(h.api.scrollTo).toHaveBeenLastCalledWith(1)
    expect(h.autoplayStop).toHaveBeenCalledTimes(3)
    // Alvos de 44 px no celular.
    expect(anterior).toHaveClass('size-11')
    expect(proximo).toHaveClass('size-11')
  })

  it('carregando: o esqueleto tem o formato do cartaz sozinho', () => {
    const { container } = mostrar(undefined, { isLoading: true })
    const esqueletos = container.querySelectorAll('[data-slot="skeleton"]')
    expect(esqueletos).toHaveLength(1)
    expect(esqueletos[0]).toHaveClass('mx-auto', 'max-w-6xl', 'aspect-[12/5]')
  })

  it('banner sem imagem, sem texto e com título "." não aparece', () => {
    const { container } = mostrar([soCartaz({ title: '.', imageUrl: null })])
    expect(container).toBeEmptyDOMElement()
  })
})
