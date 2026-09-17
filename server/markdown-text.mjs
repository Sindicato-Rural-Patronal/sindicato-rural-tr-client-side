// Markdown → texto corrido para as meta OpenGraph (a descrição do curso é
// markdown; sem isto o WhatsApp mostrava "## Conteúdo **Aulas**…"). Mesmas
// regras de src/lib/markdown-text.ts, repetidas aqui porque o servidor é Node
// puro (sem build); src/test/utils/server-markdown-text.test.ts confere que as
// duas dão o mesmo resultado.
export function markdownToText(md) {
  if (!md) return ''
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')            // blocos de código
    .replace(/<[^>]+>/g, ' ')                    // tags HTML
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')    // imagem → texto alternativo
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // link → texto do link
    .replace(/^\s{0,3}(#{1,6}|>+)\s*/gm, '')     // títulos e citações
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')     // marcadores de lista
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ')       // linha horizontal
    .replace(/^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-*:?\s*$/gm, ' ') // separador de tabela
    .replace(/\|/g, ' ')
    .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')       // negrito / tachado
    .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, '$2')    // itálico
    .replace(/`([^`]*)`/g, '$1')                 // código em linha
    .replace(/\s+/g, ' ')
    .trim()
}
