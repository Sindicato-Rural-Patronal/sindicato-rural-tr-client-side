import { describe, it, expect } from 'vitest'
import {
  HELP_ARTICLES, HELP_GROUPS, articleSections, filterArticles, groupArticles, relatedArticles,
  searchExcerpt, slug, visibleArticles,
} from '@/lib/help'

const all = () => true
const ids = (list: { id: string }[]) => list.map(a => a.id)

describe('artigos da ajuda', () => {
  it('todo artigo tem título, resumo e grupo conhecido', () => {
    expect(HELP_ARTICLES.length).toBeGreaterThan(0)
    const groups = HELP_GROUPS.map(g => g.id)
    for (const article of HELP_ARTICLES) {
      expect(article.title, article.id).not.toBe('')
      expect(article.summary, article.id).not.toBe('')
      expect(groups, article.id).toContain(article.group)
      expect(article.body.length, article.id).toBeGreaterThan(100)
    }
  })

  it('o cabeçalho não vaza para o corpo do artigo', () => {
    for (const article of HELP_ARTICLES) {
      expect(article.body.startsWith('---'), article.id).toBe(false)
      expect(article.body, article.id).not.toContain('titulo:')
    }
  })

  it('todo link "?topico=" aponta para um artigo que existe', () => {
    const known = new Set(ids(HELP_ARTICLES))
    for (const article of HELP_ARTICLES) {
      for (const [, target] of article.body.matchAll(/\(\?topico=([a-z0-9-]+)\)/g)) {
        expect(known, `${article.id} → ${target}`).toContain(target)
      }
    }
  })

  it('só pede permissões que alguma tela do painel usa', () => {
    const real = [
      'READ_COURSE', 'READ_NEWS', 'READ_USER', 'READ_BANNER',
      'READ_MARKET_QUOTE', 'READ_CONVENIO', 'READ_CONTACT', 'READ_AUDIT', 'READ_FINANCE',
    ]
    for (const article of HELP_ARTICLES) {
      if (article.perm) expect(real, article.id).toContain(article.perm)
    }
  })
})

describe('"Ver também"', () => {
  it('todo artigo apontado existe, e nenhum aponta para si mesmo', () => {
    const known = new Set(ids(HELP_ARTICLES))
    for (const article of HELP_ARTICLES) {
      for (const alvo of article.related) {
        expect(known, `${article.id} → ${alvo}`).toContain(alvo)
        expect(alvo, article.id).not.toBe(article.id)
      }
    }
  })

  it('só oferece o que a pessoa pode abrir', () => {
    // Quem só tem READ_USER não pode cair num "Ver também" para o Financeiro.
    const onlyUsers = (perm: string) => perm === 'READ_USER'
    const visible = visibleArticles(HELP_ARTICLES, onlyUsers)
    for (const article of visible) {
      for (const outro of relatedArticles(article, visible)) {
        expect(outro.perm === null || outro.perm === 'READ_USER', `${article.id} → ${outro.id}`).toBe(true)
      }
    }
  })
})

describe('slug e articleSections', () => {
  it('título vira âncora sem acento nem maiúscula', () => {
    expect(slug('Prazo de inscrição')).toBe('prazo-de-inscricao')
    expect(slug('  Ações rápidas!  ')).toBe('acoes-rapidas')
  })

  it('lista os títulos de seção do artigo', () => {
    const cursos = HELP_ARTICLES.find(a => a.id === 'cursos')!
    const secoes = articleSections(cursos.body)
    expect(secoes.map(s => s.titulo)).toContain('Presença')
    expect(secoes.find(s => s.titulo === 'Presença')?.id).toBe('presenca')
  })

  it('não confunde subtítulo (###) nem linha de bloco de código', () => {
    const body = [
      '## Um', 'texto', '### Não é seção', '```', '## Dentro do código', '```', '## Dois',
    ].join('\n')
    expect(articleSections(body).map(s => s.titulo)).toEqual(['Um', 'Dois'])
  })

  it('os artigos que ganham sumário têm âncoras únicas', () => {
    for (const article of HELP_ARTICLES) {
      const ids = articleSections(article.body).map(s => s.id)
      expect(new Set(ids).size, article.id).toBe(ids.length)
    }
  })
})

describe('searchExcerpt', () => {
  it('devolve um trecho em volta da palavra buscada', () => {
    const usuarios = HELP_ARTICLES.find(a => a.id === 'usuarios')!
    const trecho = searchExcerpt(usuarios, 'duplicados')!
    expect(trecho.toLowerCase()).toContain('duplicados')
    expect(trecho.length).toBeLessThan(200)
  })

  it('tira a formatação do markdown do trecho', () => {
    const trecho = searchExcerpt(HELP_ARTICLES.find(a => a.id === 'cursos')!, 'sala')!
    expect(trecho).not.toMatch(/[*#`|]/)
  })

  it('sem busca, ou sem achar a palavra, não devolve trecho', () => {
    const artigo = HELP_ARTICLES[0]
    expect(searchExcerpt(artigo, '   ')).toBeNull()
    expect(searchExcerpt(artigo, 'jabuticaba')).toBeNull()
  })
})

describe('visibleArticles', () => {
  it('artigo sem permissão é de todo mundo', () => {
    const none = () => false
    const visible = visibleArticles(HELP_ARTICLES, none)
    expect(visible.every(a => a.perm === null)).toBe(true)
    expect(ids(visible)).toContain('primeiros-passos')
  })

  it('libera só o assunto da permissão que a pessoa tem', () => {
    const onlyFinance = (perm: string) => perm === 'READ_FINANCE'
    const visible = ids(visibleArticles(HELP_ARTICLES, onlyFinance))
    expect(visible).toContain('financeiro')
    expect(visible).not.toContain('auditoria')
  })
})

describe('filterArticles', () => {
  it('busca vazia devolve tudo', () => {
    expect(filterArticles(HELP_ARTICLES, '   ')).toHaveLength(HELP_ARTICLES.length)
  })

  it('ignora acentos e maiúsculas', () => {
    expect(ids(filterArticles(HELP_ARTICLES, 'COTACOES'))).toContain('cotacoes')
  })

  it('acha pelo texto do artigo, não só pelo título', () => {
    expect(ids(filterArticles(HELP_ARTICLES, 'juntar cadastros'))).toContain('usuarios')
  })

  it('com várias palavras, todas precisam aparecer', () => {
    expect(filterArticles(HELP_ARTICLES, 'banner jacaré')).toHaveLength(0)
  })
})

describe('groupArticles', () => {
  it('mantém a ordem dos grupos e descarta os vazios', () => {
    const groups = groupArticles(visibleArticles(HELP_ARTICLES, all))
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every(g => g.articles.length > 0)).toBe(true)

    const order = HELP_GROUPS.map(g => g.id)
    const shown = groups.map(g => g.id)
    expect(shown).toEqual([...shown].sort((a, b) => order.indexOf(a) - order.indexOf(b)))
  })

  it('"Como funciona o painel" é o primeiro de Primeiros passos', () => {
    const first = groupArticles(visibleArticles(HELP_ARTICLES, all))[0]
    expect(first.id).toBe('primeiros-passos')
    expect(first.articles[0].id).toBe('primeiros-passos')
  })
})
