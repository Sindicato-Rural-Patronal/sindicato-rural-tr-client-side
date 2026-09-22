import { describe, it, expect } from 'vitest'
import { NAV_ITEMS, filterNavItems } from '@/lib/command-palette'

const all = () => true
const labels = (query: string, can: (perm: string) => boolean = all) =>
  filterNavItems(NAV_ITEMS, query, can).map(item => item.label)

describe('filterNavItems', () => {
  it('ignora acentos e maiúsculas dos dois lados', () => {
    expect(labels('noticias')).toContain('Notícias')
    expect(labels('NOTÍCIAS')).toContain('Notícias')
    expect(labels('configuracoes')).toEqual(expect.arrayContaining([
      'Configurações · Dados do sindicato',
      'Configurações · Galerias',
    ]))
    expect(labels('cotacoes')).toEqual(['Cotações'])
  })

  it('"unimed" leva à tela da Unimed', () => {
    expect(labels('unimed')).toEqual(['Unimed'])
  })

  it('acha Minha conta', () => {
    expect(labels('minha conta')).toEqual(['Minha conta'])
    expect(labels('senha')).toContain('Minha conta')
  })

  it('várias palavras: todas precisam aparecer (nome ou palavras extras)', () => {
    expect(labels('configuracoes galerias')).toEqual(['Configurações · Galerias'])
  })

  it('"salas" leva à aba de Configurações (a tela própria saiu)', () => {
    expect(labels('salas')).toEqual(['Configurações · Salas'])
    expect(labels('auditorio')).toEqual(['Configurações · Salas'])
  })

  it('busca vazia lista tudo que a pessoa pode ver', () => {
    expect(labels('   ')).toHaveLength(NAV_ITEMS.length)
  })

  it('respeita permissões (telas sem permissão somem)', () => {
    const onlyNews = (perm: string) => perm === 'READ_NEWS'
    expect(labels('', onlyNews)).toEqual(['Painel Geral', 'Notícias', 'Minha conta', 'Ajuda'])
    expect(labels('unimed', onlyNews)).toEqual([])
  })
})
