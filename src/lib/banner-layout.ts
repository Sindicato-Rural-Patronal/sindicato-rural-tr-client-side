import type { PublicBanner } from '@/hooks/useBanner'

// Como o banner aparece no site (SR-155). O Sindicato faz cartazes com o texto
// já escrito na imagem e, como o título é obrigatório, às vezes põe só um "."
// nele. Sem subtítulo e sem botões, o site mostra só o cartaz, centralizado, e
// o título vira o texto para leitor de tela.

/** Texto que entra no lugar de um título sem letra nem número ("." "-" "…"). */
export const BANNER_FALLBACK_TITLE = 'Aviso do Sindicato Rural de Terra Roxa'

/** O título diz alguma coisa? Vazio ou só pontuação não diz. */
export function hasBannerTitle(title: string | null | undefined): boolean {
  return /[\p{L}\p{N}]/u.test(title ?? '')
}

/** O título para mostrar ou ler: o do painel ou, se ele não diz nada, o texto neutro. */
export function bannerTitle(title: string | null | undefined): string {
  return hasBannerTitle(title) ? (title ?? '').trim() : BANNER_FALLBACK_TITLE
}

/** Cartaz sem subtítulo e sem botões: o texto está na imagem, e ela aparece sozinha. */
export function isPosterOnly(banner: Pick<PublicBanner, 'imageUrl' | 'subtitle' | 'buttons'>): boolean {
  return !!banner.imageUrl && !banner.subtitle?.trim() && banner.buttons.length === 0
}

/** Banner sem imagem, sem subtítulo, sem botões e sem título de verdade não tem o que mostrar. */
export function bannerHasContent(banner: Pick<PublicBanner, 'title' | 'imageUrl' | 'subtitle' | 'buttons'>): boolean {
  return !!banner.imageUrl || !!banner.subtitle?.trim() || banner.buttons.length > 0 || hasBannerTitle(banner.title)
}
