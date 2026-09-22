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
//   veja:    ids de outros artigos, separados por vírgula    (opcional)
import { upperNoAccents } from '@/utils/text-format'

export type HelpGroupId = 'primeiros-passos' | 'dia-a-dia' | 'site' | 'gestao' | 'conta'

export type HelpArticle = {
  id: string
  title: string
  summary: string
  group: HelpGroupId
  perm: string | null
  keywords: string
  /** Ids de artigos ligados a este (viram "Ver também" no fim da página). */
  related: string[]
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
        related: (meta.veja || '').split(',').map(v => v.trim()).filter(Boolean),
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

/**
 * Para onde mandar quem esbarrou num "sem permissão". Aponta para a seção do
 * artigo de boas-vindas, que NÃO exige permissão nenhuma — o artigo de
 * administradores explicaria melhor, mas quem está vendo o aviso é justamente
 * quem não pode abri-lo.
 */
export const HELP_PERMISSOES = {
  topico: 'primeiros-passos',
  hash: 'por-que-voce-nao-ve-tudo-o-que-seu-colega-ve',
}

/** Os artigos de "Ver também" que este admin pode mesmo abrir. */
export function relatedArticles(article: HelpArticle, visible: readonly HelpArticle[]): HelpArticle[] {
  return article.related
    .map(id => visible.find(a => a.id === id))
    .filter((a): a is HelpArticle => Boolean(a))
}

/** Transforma um título em âncora ("Como funciona" → "como-funciona"). */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Os títulos de seção do artigo (as linhas `## `), para o "Nesta página".
 * Artigo curto não ganha sumário — quem chama decide pelo tamanho da lista.
 */
export function articleSections(body: string): { titulo: string; id: string }[] {
  const secoes: { titulo: string; id: string }[] = []
  let emBlocoDeCodigo = false
  for (const linha of body.split(/\r?\n/)) {
    if (linha.startsWith('```')) emBlocoDeCodigo = !emBlocoDeCodigo
    if (emBlocoDeCodigo) continue
    const titulo = /^##\s+(.+?)\s*$/.exec(linha)?.[1]
    if (titulo) secoes.push({ titulo, id: slug(titulo) })
  }
  return secoes
}

/**
 * Um pedaço do texto em volta da primeira palavra buscada, para a pessoa ver
 * POR QUE o artigo apareceu na lista (só o título não diz).
 */
export function searchExcerpt(article: HelpArticle, query: string, tamanho = 120): string | null {
  const palavras = upperNoAccents(query).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return null

  // Sem a formatação do markdown, senão o trecho sai cheio de `#`, `*` e links.
  const texto = article.body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const alvo = upperNoAccents(texto)
  const onde = palavras.map(p => alvo.indexOf(p)).filter(i => i >= 0).sort((a, b) => a - b)[0]
  if (onde === undefined) return null

  // Começa uma palavra antes para o trecho não cortar no meio de uma.
  const de = Math.max(0, texto.lastIndexOf(' ', Math.max(0, onde - tamanho / 3)) + 1)
  const ate = Math.min(texto.length, de + tamanho)
  const corte = texto.slice(de, ate).trim()
  return `${de > 0 ? '…' : ''}${corte}${ate < texto.length ? '…' : ''}`
}

/** Agrupa para o menu, já sem os grupos que ficaram vazios. */
export function groupArticles(articles: HelpArticle[]) {
  return HELP_GROUPS
    .map(group => ({ ...group, articles: articles.filter(a => a.group === group.id) }))
    .filter(group => group.articles.length > 0)
}
