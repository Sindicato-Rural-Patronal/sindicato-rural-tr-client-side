import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  aplicarModelo, avisoDadosPessoais, chaveDoUltimo, estadoInicial, filtrarGrupos, filtrosEmPalavras,
  formatoNaTela, guardarUltimo, lerCatalogo, lerUltimo, limparCampos, marcarCampo, modeloParaApi,
  modelosDe, moverCampo, moverPara, nomeDoModelo, problemaParaBaixar, textoDoBotao, tirarCampo,
  PADRAO_ID, PADRAO_NOME, type ReportState,
} from '@/components/export/report-builder'
import { CATALOGO_PESSOAS_CRU, catalogoInscricoes, catalogoPessoas } from './export-catalog.fixture'

// O estado do montador de relatórios (decisão 006): puro, sem React. Os
// catálogos são recortes do formato real da API (SR-088).

const cat = catalogoPessoas()

function estado(over: Partial<ReportState> = {}): ReportState {
  return { fields: ['name', 'cpf'], modeloId: 'nome-cpf', format: 'csv', scope: 'all', confirmed: false, avisos: [], ...over }
}

describe('lerCatalogo', () => {
  it('aceita o formato da decisão e completa o que falta', () => {
    expect(cat.title).toBe('Pessoas')
    expect(cat.groups.map(g => g.name)).toEqual(['Identificação', 'Documentos', 'Contato', 'Endereço', 'Relatório'])
    expect(cat.limits).toEqual({ rows: 20000, pdfRows: 2000, fields: 80 })
    const rg = cat.groups[1].fields[1]
    expect(rg).toMatchObject({ key: 'rg', allowed: false, reason: 'Pede a permissão Visualizar usuários' })
  })

  it('resposta fora do formato vira null (back velho, mock, HTML do proxy)', () => {
    expect(lerCatalogo(null)).toBeNull()
    expect(lerCatalogo({})).toBeNull()
    expect(lerCatalogo('<html>')).toBeNull()
    expect(lerCatalogo({ data: [], total: 0 })).toBeNull()
    expect(lerCatalogo({ groups: [] })).toBeNull()
    expect(lerCatalogo({ groups: [{ name: 'X', fields: [{ nada: 1 }] }] })).toBeNull()
  })

  it('sem limites, modelos e filterLabels, usa os padrões da decisão', () => {
    const c = lerCatalogo({ groups: [{ name: 'G', fields: [{ key: 'a', label: 'A' }] }] })!
    expect(c.limits).toEqual({ rows: 20000, pdfRows: 2000, fields: 80 })
    expect(c.modelos).toEqual([])
    expect(c.filterLabels).toEqual({})
    expect(c.groups[0].fields[0]).toMatchObject({ type: 'text', privacy: 'comum', allowed: true, reason: null })
  })

  it('o "Só confirmadas" do modelo pode vir como confirmed ou em filters', () => {
    const c = lerCatalogo({
      groups: [{ name: 'G', fields: [{ key: 'a', label: 'A' }] }],
      modelos: [
        { id: 'x', name: 'X', fields: ['a'], confirmed: true },
        { id: 'y', name: 'Y', fields: ['a'], filters: { confirmed: true } },
        { id: 'z', name: 'Z', fields: ['a'] },
      ],
    })!
    expect(c.modelos.map(m => m.confirmed)).toEqual([true, true, false])
  })
})

describe('modelos', () => {
  it('o Padrão (como hoje) vem sempre primeiro, com as colunas do padrão', () => {
    const m = modelosDe(cat)
    expect(m[0]).toMatchObject({ id: PADRAO_ID, name: PADRAO_NOME, fields: CATALOGO_PESSOAS_CRU.padrao })
    expect(m.map(x => x.name)).toContain('Nome e CPF')
  })

  it('não repete o Padrão quando o catálogo já o traz', () => {
    const c = catalogoPessoas({ modelos: [{ id: 'padrao', name: 'Padrão', fields: ['name'] }, ...cat.modelos] })
    expect(modelosDe(c).filter(m => m.id === PADRAO_ID)).toHaveLength(1)
  })

  it('aplicar um modelo preenche as colunas na ordem dele', () => {
    const s = aplicarModelo(estado({ fields: [], modeloId: null }), cat, 'nome-email')
    expect(s.fields).toEqual(['name', 'email'])
    expect(s.modeloId).toBe('nome-email')
    expect(nomeDoModelo(s, cat)).toBe('Nome e e-mail')
  })

  it('mexer depois de aplicar mostra "(alterado)"; voltar ao que era tira', () => {
    let s = aplicarModelo(estado(), cat, 'nome-cpf')
    s = marcarCampo(s, cat, 'email')
    expect(nomeDoModelo(s, cat)).toBe('Nome e CPF (alterado)')
    s = tirarCampo(s, 'email')
    expect(nomeDoModelo(s, cat)).toBe('Nome e CPF')
    s = moverCampo(s, 'cpf', -1)
    expect(nomeDoModelo(s, cat)).toBe('Nome e CPF (alterado)')
  })

  it('montado à mão não tem nome de modelo', () => {
    expect(nomeDoModelo(estado({ modeloId: null }), cat)).toBeNull()
    expect(modeloParaApi(estado({ modeloId: null }), cat)).toBeUndefined()
  })

  it('o modelo que vai para a API é o nome que a tela mostra, até 64 caracteres', () => {
    const s = marcarCampo(aplicarModelo(estado(), cat, 'nome-cpf'), cat, 'email')
    expect(modeloParaApi(s, cat)).toBe('Nome e CPF (alterado)')
    const longo = catalogoPessoas({ modelos: [{ id: 'l', name: 'x'.repeat(80), fields: ['name'] }] })
    expect(modeloParaApi(aplicarModelo(estado(), longo, 'l'), longo)).toHaveLength(64)
  })

  it('o modelo com campo sem permissão abre sem ele e avisa', () => {
    const s = aplicarModelo(estado(), cat, 'antigo')
    expect(s.fields).toEqual(['name'])
    expect(s.avisos.join(' ')).toContain('RG')
    expect(s.avisos.join(' ')).toContain('1 campo do modelo não existe mais')
    // O que saiu por permissão não conta como "alterado": é o modelo possível.
    expect(nomeDoModelo(s, cat)).toBe('Com campo que sumiu')
  })

  it('o Padrão também perde o campo sem permissão', () => {
    const s = aplicarModelo(estado(), cat, PADRAO_ID)
    expect(s.fields).toEqual(['name', 'nickname', 'cpf', 'birthDate', 'email', 'phone'])
    expect(s.avisos[0]).toContain('RG')
  })

  it('a Lista de presença das inscrições liga "Só confirmadas"; os outros não desligam', () => {
    const insc = catalogoInscricoes()
    let s = aplicarModelo(estado(), insc, 'lista-presenca')
    expect(s.confirmed).toBe(true)
    expect(s.fields).toEqual(['ordinal', 'name', 'cpf', 'signature'])
    s = aplicarModelo(s, insc, 'nome-cpf')
    expect(s.confirmed).toBe(true)
    // A de pessoas não tem "Só confirmadas".
    expect(aplicarModelo(estado(), cat, 'lista-presenca').confirmed).toBe(false)
  })

  it('modelo que não existe não muda nada', () => {
    const s = estado()
    expect(aplicarModelo(s, cat, 'nao-existe')).toBe(s)
  })
})

describe('marcar, desmarcar e ordenar', () => {
  it('marcar põe no fim; marcar de novo tira', () => {
    let s = marcarCampo(estado(), cat, 'phone')
    expect(s.fields).toEqual(['name', 'cpf', 'phone'])
    s = marcarCampo(s, cat, 'name')
    expect(s.fields).toEqual(['cpf', 'phone'])
  })

  it('campo sem permissão ou que não existe não entra', () => {
    const s = estado()
    expect(marcarCampo(s, cat, 'rg')).toBe(s)
    expect(marcarCampo(s, cat, 'inventado')).toBe(s)
  })

  it('não passa do limite de campos', () => {
    const c = catalogoPessoas({ limits: { rows: 20000, pdfRows: 2000, fields: 2 } })
    const s = estado()
    expect(marcarCampo(s, c, 'email')).toBe(s)
  })

  it('↑ e ↓ trocam com o vizinho; na ponta não fazem nada', () => {
    const s = estado({ fields: ['name', 'cpf', 'email'] })
    expect(moverCampo(s, 'cpf', -1).fields).toEqual(['cpf', 'name', 'email'])
    expect(moverCampo(s, 'cpf', 1).fields).toEqual(['name', 'email', 'cpf'])
    expect(moverCampo(s, 'name', -1)).toBe(s)
    expect(moverCampo(s, 'email', 1)).toBe(s)
    expect(moverCampo(s, 'phone', 1)).toBe(s)
  })

  it('arrastar leva de uma posição para outra', () => {
    const s = estado({ fields: ['a', 'b', 'c', 'd'] })
    expect(moverPara(s, 0, 2).fields).toEqual(['b', 'c', 'a', 'd'])
    expect(moverPara(s, 3, 0).fields).toEqual(['d', 'a', 'b', 'c'])
    expect(moverPara(s, 1, 1)).toBe(s)
    expect(moverPara(s, 1, 9)).toBe(s)
  })

  it('mexer apaga os avisos do modelo', () => {
    const s = aplicarModelo(estado(), cat, 'antigo')
    expect(marcarCampo(s, cat, 'cpf').avisos).toEqual([])
  })
})

describe('limparCampos', () => {
  it('tira o que sumiu, o sem permissão e o repetido, e corta no limite', () => {
    const c = catalogoPessoas({ limits: { rows: 20000, pdfRows: 2000, fields: 3 } })
    const r = limparCampos(c, ['name', 'name', 'rg', 'sumiu', 'cpf', 'email', 'phone'])
    expect(r).toEqual({ campos: ['name', 'cpf', 'email'], semPermissao: ['RG'], sumiram: ['sumiu'], cortados: 1 })
  })
})

describe('estadoInicial', () => {
  it('na primeira vez abre no Padrão, em CSV, com todos', () => {
    const s = estadoInicial(cat)
    expect(s.modeloId).toBe(PADRAO_ID)
    expect(s.fields).toEqual(['name', 'nickname', 'cpf', 'birthDate', 'email', 'phone'])
    expect(s.format).toBe('csv')
    expect(s.scope).toBe('all')
  })

  it('com registros marcados na lista, começa em "Selecionados"', () => {
    expect(estadoInicial(cat, { selecionados: 3 }).scope).toBe('selected')
  })

  it('depois abre no último usado, com o nome do modelo quando bate', () => {
    const s = estadoInicial(cat, { ultimo: { fields: ['name', 'cpf'], format: 'pdf' } })
    expect(s.fields).toEqual(['name', 'cpf'])
    expect(s.format).toBe('pdf')
    expect(s.modeloId).toBe('nome-cpf')
  })

  it('último usado que não bate com nenhum modelo abre como montado à mão', () => {
    const s = estadoInicial(cat, { ultimo: { fields: ['cpf', 'name', 'phone'], format: 'csv' } })
    expect(s.modeloId).toBeNull()
    expect(s.fields).toEqual(['cpf', 'name', 'phone'])
  })

  it('o último usado perde o campo que sumiu ou ficou sem permissão, e avisa', () => {
    const s = estadoInicial(cat, { ultimo: { fields: ['name', 'rg', 'velho'], format: 'csv' } })
    expect(s.fields).toEqual(['name'])
    expect(s.avisos.join(' ')).toContain('RG')
    expect(s.avisos.join(' ')).toContain('último relatório')
  })

  it('último usado sem nenhum campo que ainda vale volta ao Padrão', () => {
    const s = estadoInicial(cat, { ultimo: { fields: ['velho'], format: 'pdf' } })
    expect(s.modeloId).toBe(PADRAO_ID)
    expect(s.format).toBe('pdf')
  })

  it('o último usado da Lista de presença volta com "Só confirmadas"', () => {
    const s = estadoInicial(catalogoInscricoes(), { ultimo: { fields: ['ordinal', 'name', 'cpf', 'signature'], format: 'pdf' } })
    expect(s.confirmed).toBe(true)
  })
})

describe('busca de campos', () => {
  it('ignora acento e maiúscula', () => {
    const r = filtrarGrupos(cat.groups, 'NASCI')
    expect(r).toEqual([{ name: 'Identificação', fields: [expect.objectContaining({ key: 'birthDate' })] }])
    expect(filtrarGrupos(cat.groups, 'e-mail')[0].fields.map(f => f.key)).toEqual(['email'])
  })

  it('o nome do grupo traz o grupo inteiro', () => {
    const r = filtrarGrupos(cat.groups, 'endereco')
    expect(r).toHaveLength(1)
    expect(r[0].fields.map(f => f.key)).toEqual(['addressCity', 'addressLine'])
  })

  it('todas as palavras precisam aparecer; busca vazia devolve tudo', () => {
    expect(filtrarGrupos(cat.groups, 'endereco linha')[0].fields.map(f => f.key)).toEqual(['addressLine'])
    expect(filtrarGrupos(cat.groups, 'xyz')).toEqual([])
    expect(filtrarGrupos(cat.groups, '  ')).toBe(cat.groups)
  })
})

describe('o que vai sair', () => {
  it('"Leva dados pessoais" lista os sensíveis primeiro e depois os pessoais, na ordem das colunas', () => {
    expect(avisoDadosPessoais(estado({ fields: ['cpf', 'name', 'ethnicity', 'email'] }), cat))
      .toBe('Leva dados pessoais: Etnia, CPF, E-mail.')
    expect(avisoDadosPessoais(estado({ fields: ['name', 'nickname'] }), cat)).toBeNull()
  })

  it('passando de 8 campos pessoais, cita 8 e diz quantos faltam', () => {
    const muitos = lerCatalogo({
      groups: [{ name: 'G', fields: Array.from({ length: 11 }, (_, i) => ({ key: `p${i}`, label: `P${i}`, privacy: 'pessoal' })) }],
    })!
    const s = estado({ fields: muitos.groups[0].fields.map(f => f.key) })
    expect(avisoDadosPessoais(s, muitos)).toBe('Leva dados pessoais: P0, P1, P2, P3, P4, P5, P6, P7 e mais 3.')
  })

  it('no celular não há Imprimir: vira PDF', () => {
    expect(formatoNaTela('print', true)).toBe('pdf')
    expect(formatoNaTela('print', false)).toBe('print')
    expect(formatoNaTela('csv', true)).toBe('csv')
  })

  it('o botão diz o formato e quantos registros', () => {
    expect(textoDoBotao('csv', 123)).toBe('Baixar planilha (123)')
    expect(textoDoBotao('pdf', 1500)).toBe('Baixar PDF (1.500)')
    expect(textoDoBotao('print', undefined)).toBe('Imprimir')
  })

  it('filtros em palavras usam os nomes do catálogo', () => {
    expect(filtrosEmPalavras(
      { search: 'silva', activeMember: true, gender: '', memberType: undefined, semNome: 'x', incompleteRegistration: 'true' },
      cat.filterLabels,
    )).toEqual(['Busca: silva', 'Só associados em dia', 'Cadastro incompleto'])
    expect(filtrosEmPalavras({ courseIds: ['c1'] }, catalogoInscricoes().filterLabels)).toEqual(['Cursos (1)'])
    expect(filtrosEmPalavras({ activeMember: false }, cat.filterLabels)).toEqual([])
  })
})

describe('problemaParaBaixar', () => {
  const base = { total: 123, selecionados: 0 }

  it('sem campo não baixa', () => {
    expect(problemaParaBaixar(estado({ fields: [] }), cat, base)).toBe('Escolha pelo menos um campo.')
  })

  it('"Selecionados" sem nada marcado não baixa', () => {
    expect(problemaParaBaixar(estado({ scope: 'selected' }), cat, base)).toMatch(/Nenhum registro selecionado/)
    expect(problemaParaBaixar(estado({ scope: 'selected' }), cat, { ...base, selecionados: 2 })).toBeNull()
  })

  it('PDF passa de 2.000 linhas: avisa antes; a planilha pode', () => {
    const muitos = { total: 2500, selecionados: 0 }
    expect(problemaParaBaixar(estado({ format: 'pdf' }), cat, muitos))
      .toBe('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')
    expect(problemaParaBaixar(estado({ format: 'print' }), cat, muitos)).toMatch(/O PDF aceita/)
    expect(problemaParaBaixar(estado({ format: 'csv' }), cat, muitos)).toBeNull()
  })

  it('mais de 20.000 linhas não baixa em formato nenhum', () => {
    expect(problemaParaBaixar(estado(), cat, { total: 20001, selecionados: 0 }))
      .toBe('O relatório passa de 20.000 linhas. Use um filtro para diminuir.')
  })

  it('total desconhecido ou "Só confirmadas" deixa a API decidir', () => {
    expect(problemaParaBaixar(estado({ format: 'pdf' }), cat, { selecionados: 0 })).toBeNull()
    expect(problemaParaBaixar(estado({ format: 'pdf', confirmed: true }), cat, { total: 5000, selecionados: 0 })).toBeNull()
  })

  it('lista vazia não baixa', () => {
    expect(problemaParaBaixar(estado(), cat, { total: 0, selecionados: 0 })).toBe('Nenhum registro para exportar.')
  })
})

describe('último relatório no navegador', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('guarda { fields, format } na chave sr:relatorio:<dataset>', () => {
    guardarUltimo('people', { fields: ['name', 'cpf'], format: 'pdf' })
    expect(JSON.parse(localStorage.getItem(chaveDoUltimo('people'))!)).toEqual({ fields: ['name', 'cpf'], format: 'pdf' })
    expect(chaveDoUltimo('people')).toBe('sr:relatorio:people')
    expect(lerUltimo('people')).toEqual({ fields: ['name', 'cpf'], format: 'pdf' })
    expect(lerUltimo('registrations')).toBeNull()
  })

  it('valor estragado é o mesmo que nada salvo', () => {
    localStorage.setItem('sr:relatorio:people', '{oops')
    expect(lerUltimo('people')).toBeNull()
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: [1, 'name'], format: 'xls' }))
    expect(lerUltimo('people')).toEqual({ fields: ['name'], format: 'csv' })
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: [] }))
    expect(lerUltimo('people')).toBeNull()
  })

  it('navegador sem storage não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    expect(lerUltimo('people')).toBeNull()
    expect(() => guardarUltimo('people', { fields: ['name'], format: 'csv' })).not.toThrow()
  })
})
