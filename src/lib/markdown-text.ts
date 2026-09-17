/**
 * Texto corrido a partir de markdown, para prévias curtas (ex.: descrição no
 * card do curso), sem mostrar "##", "**" ou links crus.
 */
export function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return ''
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')            // blocos de código
    .replace(/<[^>]+>/g, ' ')                    // tags HTML
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')    // imagem → texto alternativo
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // link → texto do link
    .replace(/^\s{0,3}(#{1,6}|>+)\s*/gm, '')     // títulos e citações
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')     // marcadores de lista
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ')       // linha horizontal
    .replace(/^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-*:?\s*$/gm, ' ') // separador de tabela
    .replace(/\|/g, ' ')
    .replace(/(\*\*|~~)(.+?)\1/g, '$2')          // negrito / tachado
    .replace(/(^|\W)__(.+?)__(?!\w)/g, '$1$2')
    .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')        // itálico
    .replace(/(^|\W)_(\S(?:.*?\S)?)_(?!\w)/g, '$1$2') // "_" só fora de palavras (nome_de_arquivo fica)
    .replace(/`([^`]*)`/g, '$1')                 // código em linha
    .replace(/\s+/g, ' ')
    .trim()
}
