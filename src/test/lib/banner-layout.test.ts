import { describe, it, expect } from 'vitest'
import {
  BANNER_FALLBACK_TITLE, bannerHasContent, bannerTitle, hasBannerTitle, isPosterOnly,
} from '@/lib/banner-layout'

// SR-155: o Sindicato põe "." no título obrigatório quando o cartaz já traz o texto.
describe('como o banner aparece no site', () => {
  it('título só com pontuação ou vazio não conta como título', () => {
    for (const t of ['.', '-', '…', '...', ' . ', '—', '', '   ', null, undefined]) {
      expect(hasBannerTitle(t)).toBe(false)
      expect(bannerTitle(t)).toBe(BANNER_FALLBACK_TITLE)
    }
  })

  it('título com letra ou número fica como está (sem os espaços das pontas)', () => {
    expect(bannerTitle('  DIA DE CAMPO 2026 ')).toBe('DIA DE CAMPO 2026')
    expect(bannerTitle('2026')).toBe('2026')
    expect(bannerTitle('AÇÃO')).toBe('AÇÃO')
  })

  it('só o cartaz: com imagem, sem subtítulo e sem botões', () => {
    const base = { imageUrl: 'https://x/cartaz.jpg', subtitle: null, buttons: [] }
    expect(isPosterOnly(base)).toBe(true)
    expect(isPosterOnly({ ...base, subtitle: '   ' })).toBe(true)
    expect(isPosterOnly({ ...base, subtitle: 'INSCRICOES ABERTAS' })).toBe(false)
    expect(isPosterOnly({ ...base, buttons: [{ label: 'VER', url: '/cursos', external: false, variant: 'primary' }] })).toBe(false)
    // Sem imagem não há cartaz para mostrar sozinho.
    expect(isPosterOnly({ ...base, imageUrl: null })).toBe(false)
  })

  it('banner sem nada para mostrar fica de fora', () => {
    const vazio = { title: '.', imageUrl: null, subtitle: null, buttons: [] }
    expect(bannerHasContent(vazio)).toBe(false)
    expect(bannerHasContent({ ...vazio, title: 'AVISO' })).toBe(true)
    expect(bannerHasContent({ ...vazio, imageUrl: 'https://x/cartaz.jpg' })).toBe(true)
    expect(bannerHasContent({ ...vazio, subtitle: 'TEXTO' })).toBe(true)
  })
})
