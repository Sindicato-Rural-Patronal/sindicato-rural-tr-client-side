// Central de Ajuda do painel: cada artigo é um arquivo .md em ./articles com um
// cabeçalho simples entre `---`. Para escrever um artigo novo basta criar o
// arquivo — ele entra sozinho na lista, na busca e no menu lateral da ajuda.
//
// Cabeçalho aceito:
//   titulo:  nome que aparece no menu e no topo do artigo   (obrigatório)
//   resumo:  uma linha explicando o assunto                 (obrigatório)
//   grupo:   um dos HELP_GROUPS abaixo                      (obrigatório)
//   permissao: permissão necessária para ler; vazio = todos (opcional)
//   ordem:   número que ordena dentro do grupo              (opcional)
//   busca:   palavras extras que também encontram o artigo  (opcional)
import { upperNoAccents } from '@/utils/text-format'

export type HelpGroupId = 'primeiros-passos' | 'dia-a-dia' | 'site' | 'gestao' | 'conta'

export type HelpArticle = {
  id: string
  title: string
  summary: string
  group: HelpGroupId
  perm: string | null
  keywords: string
  body: string
}

export const HELP_GROUPS: { id: HelpGroupId; label: string }[] = [
  { id: 'primeiros-passos', label: 'Primeiros passos' },
  { id: 'dia-a-dia', label: 'Dia a dia' },
  { id: 'site', label: 'O que aparece no site' },
  { id: 'gestao', label: 'Gestão e controle' },
  { id: 'conta', label: 'Sua conta' },
]

const GROUP_IDS = HELP_GROUPS.map(g => g.id)

// Lê o cabeçalho entre `---` do topo do arquivo. Sem cabeçalho, devolve tudo como corpo.
function splitFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { meta: {}, body: raw.trim() }

  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const sep = line.indexOf(':')
    if (sep <= 0) continue
    meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  return { meta, body: raw.slice(match[0].length).trim() }
}

const RAW = import.meta.glob('./articles/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function build(): HelpArticle[] {
  const articles = Object.entries(RAW).map(([path, raw]) => {
    const id = path.replace(/^\.\/articles\//, '').replace(/\.md$/, '')
    const { meta, body } = splitFrontmatter(raw)
    const group = GROUP_IDS.includes(meta.grupo as HelpGroupId) ? (meta.grupo as HelpGroupId) : 'dia-a-dia'
    const order = Number(meta.ordem)
    return {
      article: {
        id,
        title: meta.titulo || id,
        summary: meta.resumo || '',
        group,
        perm: meta.permissao || null,
        keywords: meta.busca || '',
        body,
      } satisfies HelpArticle,
      order: Number.isFinite(order) ? order : 999,
    }
  })

  return articles
    .sort((a, b) => {
      const byGroup = GROUP_IDS.indexOf(a.article.group) - GROUP_IDS.indexOf(b.article.group)
      if (byGroup !== 0) return byGroup
      if (a.order !== b.order) return a.order - b.order
      return a.article.title.localeCompare(b.article.title, 'pt-BR')
    })
    .map(a => a.article)
}

export const HELP_ARTICLES: HelpArticle[] = build()

/** Só os artigos que este admin pode ler (artigo sem permissão é de todos). */
export function visibleArticles(articles: HelpArticle[], can: (perm: string) => boolean): HelpArticle[] {
  return articles.filter(a => !a.perm || can(a.perm))
}

/**
 * Busca sem diferenciar maiúsculas nem acentos ("cotacoes" acha "Cotações"),
 * exigindo todas as palavras. Procura no título, no resumo, nas palavras extras
 * e no texto do artigo — assim "quem pode ver" acha o artigo de administradores.
 */
export function filterArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  const words = upperNoAccents(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return articles
  return articles.filter(a => {
    const text = upperNoAccents(`${a.title} ${a.summary} ${a.keywords} ${a.body}`)
    return words.every(word => text.includes(word))
  })
}

/** Agrupa para o menu, já sem os grupos que ficaram vazios. */
export function groupArticles(articles: HelpArticle[]) {
  return HELP_GROUPS
    .map(group => ({ ...group, articles: articles.filter(a => a.group === group.id) }))
    .filter(group => group.articles.length > 0)
}
