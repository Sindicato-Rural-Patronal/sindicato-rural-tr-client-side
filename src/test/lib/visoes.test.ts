import { describe, it, expect, beforeEach } from 'vitest'
import {
  ID_DO_PADRAO, alternarColuna, autoriaDaVisao, chaveDaUltimaVisao, colunasDaTela, colunasDaUrl, colunasParaUrl,
  datasDoPeriodo, deveAplicarFiltrosAoVoltar, filtrosDaVisaoEmPalavras, filtrosMudaram, filtrosParaGuardar,
  guardarUltimaVisao, lerUltimaVisao, moverColuna, patchDaVisao, pdfDesligado, periodoDasDatas, problemaDoNomeDaVisao,
  rotuloDaVisao, visaoParaApi, visoesDaLista,
} from '@/components/visoes/visoes'
import { lerCatalogo, lerModeloDaEquipe } from '@/components/export/report-builder'
import { caminhoDaLista } from '@/hooks/useFinance'
import { textoDosTotaisDosLancamentos } from '@/components/visoes/lancamentos'
import { CATALOGO_LANCAMENTOS_CRU, modeloDaEquipeCru } from './export-catalog.fixture'

// Visões da lista (decisão 007, SR-150): as regras puras. As visões de fábrica
// são as do catálogo da API (back 83a47a2, SR-149).

const VISOES_CRUAS = [
  { id: 'padrao-tela', name: 'Padrão', fields: ['number', 'date', 'description', 'payeeName', 'category', 'account', 'method', 'amount'], filters: null },
  {
    id: 'contabilidade', name: 'Contabilidade',
    fields: ['number', 'date', 'type', 'payeeName', 'payeeDocument', 'description', 'category', 'method', 'amount'],
    filters: { type: 'IN', excludeTransfers: true, periodo: 'mes-passado' },
  },
  { id: 'resumida', name: 'Resumida', fields: ['number', 'date', 'description', 'payeeName', 'amount'], filters: null },
]
const catalogo = lerCatalogo({
  ...CATALOGO_LANCAMENTOS_CRU,
  filterLabels: { ...CATALOGO_LANCAMENTOS_CRU.filterLabels, excludeTransfers: 'Sem transferências entre caixas' },
  visoes: VISOES_CRUAS,
})!

// 18/11/2026, 10h em Brasília.
const HOJE = new Date('2026-11-18T13:00:00Z')

describe('o catálogo e os modelos da equipe com as visões (contrato da SR-149)', () => {
  it('lerCatalogo lê `visoes`, com os filtros só do que está ligado', () => {
    expect(catalogo.visoes?.map(v => v.id)).toEqual(['padrao-tela', 'contabilidade', 'resumida'])
    expect(catalogo.visoes?.[1].filters).toEqual({ type: 'IN', excludeTransfers: true, periodo: 'mes-passado' })
    expect(catalogo.visoes?.[0].filters).toBeNull()
  })

  it('fonte sem visões: o campo nem aparece; visão sem colunas ou fora do formato sai', () => {
    expect(lerCatalogo(CATALOGO_LANCAMENTOS_CRU)).not.toHaveProperty('visoes')
    const c = lerCatalogo({ ...CATALOGO_LANCAMENTOS_CRU, visoes: [{ id: 'x', name: 'X', fields: [] }, 'nada', { name: 'sem id' }] })!
    expect(c.visoes).toEqual([])
  })

  it('o modelo da equipe ganha `filters` (null nos de antes)', () => {
    expect(lerModeloDaEquipe(modeloDaEquipeCru())?.filters).toBeNull()
    expect(lerModeloDaEquipe(modeloDaEquipeCru({ filters: { type: 'OUT', periodo: 'mes-atual', lixo: 3 } }))?.filters)
      .toEqual({ type: 'OUT', periodo: 'mes-atual' })
  })

  it('as visões do seletor: as de fábrica (Padrão primeiro) e depois as da equipe', () => {
    const equipe = [lerModeloDaEquipe(modeloDaEquipeCru({ id: 'm1', dataset: 'finance-transactions', name: 'Março', fields: ['number', 'amount'], filters: { type: 'IN' } }))!]
    const visoes = visoesDaLista(catalogo, equipe)
    expect(visoes.map(v => v.id)).toEqual(['padrao-tela', 'contabilidade', 'resumida', 'equipe:m1'])
    expect(visoes[3]).toMatchObject({ origem: 'equipe', name: 'Março', filters: { type: 'IN' } })
    expect(visoesDaLista(null)).toEqual([])
  })
})

describe('período relativo (dia de Brasília)', () => {
  it('as datas de cada período', () => {
    expect(datasDoPeriodo('mes-atual', HOJE)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(datasDoPeriodo('mes-passado', HOJE)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(datasDoPeriodo('ano-atual', HOJE)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(datasDoPeriodo('ultimos-12-meses', HOJE)).toEqual({ from: '2025-12-01', to: '2026-11-30' })
  })

  it('mês passado em janeiro é dezembro do ano anterior; fevereiro de ano bissexto', () => {
    expect(datasDoPeriodo('mes-passado', new Date('2027-01-10T15:00:00Z'))).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(datasDoPeriodo('mes-passado', new Date('2028-03-02T15:00:00Z'))).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('vale o dia de Brasília: 1º/12 às 01h UTC ainda é 30/11 aqui', () => {
    expect(datasDoPeriodo('mes-atual', new Date('2026-12-01T01:00:00Z'))).toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })

  it('periodoDasDatas reconhece as datas de um período (para o "Salvar como…")', () => {
    expect(periodoDasDatas('2026-10-01', '2026-10-31', HOJE)).toBe('mes-passado')
    expect(periodoDasDatas('2026-10-01', '2026-10-30', HOJE)).toBeNull()
    expect(periodoDasDatas(undefined, '2026-10-31', HOJE)).toBeNull()
  })
})

describe('aplicar a visão e o "(alterada)"', () => {
  const contabilidade = catalogo.visoes![1].filters

  it('aplicar troca só os filtros que a visão guarda (e o período vira datas)', () => {
    expect(patchDaVisao(contabilidade, HOJE)).toEqual({
      type: 'IN', excludeTransfers: true, from: '2026-10-01', to: '2026-10-31',
    })
    expect(patchDaVisao(null, HOJE)).toEqual({})
  })

  it('a visão nunca mexe em busca nem em datas fixas, mesmo se vierem', () => {
    expect(patchDaVisao({ search: 'coop', from: '2026-01-01', type: 'OUT' }, HOJE)).toEqual({ type: 'OUT' })
  })

  it('"(alterada)": só conta filtro que a visão guarda', () => {
    const tela = { type: 'IN', excludeTransfers: true, from: '2026-10-01', to: '2026-10-31' }
    expect(filtrosMudaram(contabilidade, tela, HOJE)).toBe(false)
    // Mudar um filtro que ela não guarda não altera a visão.
    expect(filtrosMudaram(contabilidade, { ...tela, categoryId: 'c1', method: 'PIX', search: 'x' }, HOJE)).toBe(false)
    expect(filtrosMudaram(contabilidade, { ...tela, type: 'OUT' }, HOJE)).toBe(true)
    expect(filtrosMudaram(contabilidade, { ...tela, excludeTransfers: undefined }, HOJE)).toBe(true)
    expect(filtrosMudaram(contabilidade, { ...tela, to: '2026-10-30' }, HOJE)).toBe(true)
    // Visão só de colunas nunca fica alterada pelos filtros.
    expect(filtrosMudaram(null, { type: 'OUT' }, HOJE)).toBe(false)
  })

  it('o rótulo e o nome para a API (até 64, o "(alterada)" não se perde)', () => {
    expect(rotuloDaVisao('Contabilidade', true)).toBe('Contabilidade (alterada)')
    expect(rotuloDaVisao('Contabilidade', false)).toBe('Contabilidade')
    expect(visaoParaApi('Contabilidade', true)).toBe('Contabilidade (alterada)')
    const comprido = 'X'.repeat(64)
    expect(visaoParaApi(comprido, false)).toBe(comprido)
    const alterada = visaoParaApi(comprido, true)
    expect(alterada).toHaveLength(64)
    expect(alterada.endsWith('… (alterada)')).toBe(true)
  })

  it('ao voltar à última visão, os filtros dela só entram se a URL não traz nenhum dos que ela guarda', () => {
    expect(deveAplicarFiltrosAoVoltar(contabilidade, {})).toBe(true)
    expect(deveAplicarFiltrosAoVoltar(contabilidade, { categoryId: 'c1' })).toBe(true)
    expect(deveAplicarFiltrosAoVoltar(contabilidade, { type: 'OUT' })).toBe(false)
    expect(deveAplicarFiltrosAoVoltar(contabilidade, { from: '2026-01-01' })).toBe(false)
    expect(deveAplicarFiltrosAoVoltar(null, {})).toBe(false)
  })
})

describe('"Guardar os filtros": só os ligados, sem busca nem datas', () => {
  it('guarda o que está ligado e o período no fim', () => {
    expect(filtrosParaGuardar({
      from: '2026-10-01', to: '2026-10-31', search: 'coop', type: 'IN', categoryId: undefined, accountId: '',
      excludeTransfers: true, orderBy: undefined,
    }, 'mes-passado')).toEqual({ type: 'IN', excludeTransfers: true, periodo: 'mes-passado' })
  })

  it('`false` não é guardado (vale como ausente); nada ligado e sem período = null', () => {
    expect(filtrosParaGuardar({ excludeTransfers: false, type: undefined }, null)).toBeNull()
    expect(filtrosParaGuardar({}, 'ano-atual')).toEqual({ periodo: 'ano-atual' })
  })

  it('em palavras, como o PDF, com o período no fim', () => {
    expect(filtrosDaVisaoEmPalavras(
      { type: 'IN', excludeTransfers: true, periodo: 'mes-passado' },
      catalogo.filterLabels,
      { type: 'Tipo: Entrada' },
    )).toEqual(['Tipo: Entrada', 'Sem transferências entre caixas', 'Período: mês passado'])
    expect(filtrosDaVisaoEmPalavras(null, catalogo.filterLabels)).toEqual([])
  })
})

describe('as colunas na URL e no painel', () => {
  const padrao = { fields: ['number', 'date', 'amount'] }

  it('`?cols=` só quando difere da visão', () => {
    expect(colunasParaUrl(['number', 'date', 'amount'], padrao.fields)).toBeUndefined()
    expect(colunasParaUrl(['number', 'amount', 'date'], padrao.fields)).toBe('number,amount,date')
  })

  it('lê `?cols=` sem vazias nem repetidas; coluna que saiu do catálogo some', () => {
    expect(colunasDaUrl('number,,date,number, amount')).toEqual(['number', 'date', 'amount'])
    expect(colunasDaUrl('')).toBeNull()
    expect(colunasDaTela(padrao, ['number', 'sumiu', 'amount'], k => k !== 'sumiu')).toEqual(['number', 'amount'])
    // Nada sobrou: as da visão.
    expect(colunasDaTela(padrao, ['sumiu'], k => k !== 'sumiu')).toEqual(padrao.fields)
    expect(colunasDaTela(padrao, null)).toEqual(padrao.fields)
  })

  it('marcar põe no fim; desmarcar tira (fica pelo menos uma); ↑ ↓ trocam de lugar', () => {
    expect(alternarColuna(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(alternarColuna(['a', 'b'], 'a')).toEqual(['b'])
    expect(alternarColuna(['a'], 'a')).toEqual(['a'])
    expect(moverColuna(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moverColuna(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
  })

  it('a lista pede `fields` na ordem das colunas; sem colunas, o caminho de sempre', () => {
    expect(caminhoDaLista({ page: 2, limit: 20, type: 'IN' }, ['number', 'payeeDocument']))
      .toBe('/admin/finance/transactions?page=2&limit=20&type=IN&fields=number,payeeDocument')
    expect(caminhoDaLista({ page: 1 }, null)).toBe('/admin/finance/transactions?page=1')
    expect(caminhoDaLista({}, ['amount'])).toBe('/admin/finance/transactions?fields=amount')
  })
})

describe('nome, autoria, PDF e totais', () => {
  it('o nome da visão: vazio e comprido são recusados antes da API', () => {
    expect(problemaDoNomeDaVisao('  ')).toBe('Informe o nome da visão.')
    expect(problemaDoNomeDaVisao('X'.repeat(65))).toBe('O nome da visão pode ter até 64 caracteres.')
    expect(problemaDoNomeDaVisao('Contabilidade março')).toBeNull()
  })

  it('a autoria no feminino ("criada", "editada")', () => {
    const m = lerModeloDaEquipe(modeloDaEquipeCru({
      updatedBy: { id: 'a2', username: 'bali' }, updatedAt: '2026-11-11T13:00:00.000Z',
    }))!
    expect(autoriaDaVisao(m)).toBe('Visão da equipe, criada por gestor em 10/11/2026 e editada por bali em 11/11/2026.')
  })

  it('PDF acima de 2.000 linhas: desligado, com o texto da API', () => {
    expect(pdfDesligado(2001, catalogo)).toBe('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')
    expect(pdfDesligado(2000, catalogo)).toBeNull()
    expect(pdfDesligado(undefined, null)).toBeNull()
  })

  it('os totais do Excel e do PDF só com o Valor entre as colunas', () => {
    expect(textoDosTotaisDosLancamentos(['number', 'date'], 'IN')).toBeNull()
    expect(textoDosTotaisDosLancamentos(['amount'], 'IN')).toBe('O Excel e o PDF trazem o total de entradas no fim.')
    expect(textoDosTotaisDosLancamentos(['amount'], 'OUT')).toBe('O Excel e o PDF trazem o total de saídas no fim.')
    expect(textoDosTotaisDosLancamentos(['amount'], undefined)).toBe('O Excel e o PDF trazem os totais de entradas e de saídas no fim.')
  })
})

describe('o último estado no navegador (`sr:visao:<fonte>`)', () => {
  beforeEach(() => localStorage.clear())

  it('guarda e lê; o que não é do formato vira null', () => {
    guardarUltimaVisao('finance-transactions', { visao: 'contabilidade', cols: 'number,amount' })
    expect(lerUltimaVisao('finance-transactions')).toEqual({ visao: 'contabilidade', cols: 'number,amount' })
    localStorage.setItem(chaveDaUltimaVisao('finance-transactions'), '{"visao":3}')
    expect(lerUltimaVisao('finance-transactions')).toBeNull()
    localStorage.setItem(chaveDaUltimaVisao('finance-transactions'), 'nao é json')
    expect(lerUltimaVisao('finance-transactions')).toBeNull()
  })

  it('sem armazenamento (cota, aba anônima) não quebra', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('cota') }
    try {
      expect(() => guardarUltimaVisao('finance-transactions', { visao: ID_DO_PADRAO })).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
