import { useEffect } from 'react'

const SITE = 'Sindicato Rural de Terra Roxa'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Ajusta título e meta tags (description/OpenGraph/Twitter) por página.
 * Observação: previews de link em redes (WhatsApp/Facebook) são lidos por
 * crawlers que NÃO executam JS — para preview dinâmico por curso/notícia é
 * preciso SSR/prerender. Isto melhora aba do navegador, SEO no Google (que
 * renderiza JS) e o preview padrão vem das metas estáticas do index.html.
 */
export function useSeo(opts: { title?: string; description?: string; image?: string }) {
  const { title, description, image } = opts
  useEffect(() => {
    const prevTitle = document.title
    const fullTitle = title ? `${title} · ${SITE}` : SITE
    document.title = fullTitle
    setMeta('property', 'og:title', fullTitle)
    setMeta('name', 'twitter:title', fullTitle)
    if (description) {
      const clean = description.replace(/\s+/g, ' ').trim().slice(0, 200)
      setMeta('name', 'description', clean)
      setMeta('property', 'og:description', clean)
      setMeta('name', 'twitter:description', clean)
    }
    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:image', image)
    }
    return () => {
      document.title = prevTitle
    }
  }, [title, description, image])
}
