import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  aplicarModelo, avisoDadosPessoais, avisoDoCorte, camposDoResumo, chaveDoUltimo, contagem, estadoInicial, filtrarGrupos,
  filtrosEmPalavras, formatoNaTela, guardarUltimo, lerCatalogo, lerUltimo, limparCampos, marcarCampo, modeloParaApi,
  modelosDe, moverCampo, moverPara, nomeDoModelo, pdfRapido, pdfRapidoPelaApi, periodoEmPalavras, problemaParaBaixar,
  quantosVaoSair, textoDoBotao, tirarCampo, totalComCorte,
  MODELO_RESUMO, PADRAO_ID, PADRAO_NOME, TEXTO_NENHUMA_CONFIRMADA, type ReportState,
} from '@/components/export/report-builder'
import {
  CATALOGO_PESSOAS_CRU, catalogoAuditoria, catalogoInscricoes, catalogoLancamentos, catalogoPessoas,
} from './export-catalog.fixture'

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

  it('"Só confirmadas" segue o modelo: a Lista de presença liga, os outros desligam', () => {
    const insc = catalogoInscricoes()
    let s = aplicarModelo(estado(), insc, 'lista-presenca')
    expect(s.confirmed).toBe(true)
    expect(s.fields).toEqual(['ordinal', 'name', 'cpf', 'signature'])
    s = aplicarModelo(s, insc, 'nome-cpf')
    expect(s.confirmed).toBe(false)
    // Marcado à mão e depois outro modelo sem confirmed: desliga também.
    expect(aplicarModelo(estado({ confirmed: true }), insc, PADRAO_ID).confirmed).toBe(false)
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

  it('o botão diz o formato e quantos registros (ou o teto)', () => {
    expect(textoDoBotao('csv', { n: 123, teto: false })).toBe('Baixar planilha (123)')
    expect(textoDoBotao('pdf', { n: 1500, teto: false })).toBe('Baixar PDF (1.500)')
    expect(textoDoBotao('pdf', { n: 5, teto: true })).toBe('Baixar PDF (até 5)')
    expect(textoDoBotao('print', { n: undefined, teto: false })).toBe('Imprimir')
    expect(contagem({ n: 0, teto: false })).toBe(' (0)')
  })

  it('com "Só confirmadas", conta as confirmadas quando a tela sabe; senão o total é teto', () => {
    const contagens = { total: 5, selecionados: 0 }
    expect(quantosVaoSair(estado(), { ...contagens, totalConfirmadas: 3 })).toEqual({ n: 5, teto: false })
    expect(quantosVaoSair(estado({ confirmed: true }), { ...contagens, totalConfirmadas: 3 })).toEqual({ n: 3, teto: false })
    expect(quantosVaoSair(estado({ confirmed: true }), contagens)).toEqual({ n: 5, teto: true })
    expect(quantosVaoSair(estado({ confirmed: true }), { selecionados: 0 })).toEqual({ n: undefined, teto: false })
  })

  it('filtros em palavras usam os nomes do catálogo', () => {
    expect(filtrosEmPalavras(
      { search: 'silva', activeMember: true, gender: '', memberType: undefined, semNome: 'x', incompleteRegistration: 'true' },
      cat.filterLabels,
    )).toEqual(['Busca: silva', 'Só associados em dia', 'Cadastro incompleto'])
    expect(filtrosEmPalavras({ courseIds: ['c1'] }, catalogoInscricoes().filterLabels)).toEqual(['Cursos (1)'])
    expect(filtrosEmPalavras({ activeMember: false }, cat.filterLabels)).toEqual([])
  })

  it('filtro de lista fixa sai com o rótulo da tela, não com o valor gravado', () => {
    expect(filtrosEmPalavras(
      { search: 'cristina', gender: 'FEMALE', ethnicity: 'MIXED', educationLevel: 'COMPLETE_HIGHER', memberType: 'PRODUTOR RURAL' },
      cat.filterLabels,
    )).toEqual([
      'Busca: cristina', 'Sexo: Feminino', 'Etnia: Parda', 'Escolaridade: Superior completo', 'Tipo de membro: Produtor rural',
    ])
    expect(filtrosEmPalavras({ gender: 'MALE' }, cat.filterLabels)).toEqual(['Sexo: Masculino'])
    // Por extenso, como a API escreve no PDF (antes "Fund. incompleto").
    expect(filtrosEmPalavras({ educationLevel: 'INCOMPLETE_PRIMARY' }, cat.filterLabels))
      .toEqual(['Escolaridade: Fundamental incompleto'])
    expect(filtrosEmPalavras({ educationLevel: 'COMPLETE_PRIMARY' }, cat.filterLabels))
      .toEqual(['Escolaridade: Fundamental completo'])
    // Valor que a tela não conhece sai como veio.
    expect(filtrosEmPalavras({ gender: 'NOVO' }, cat.filterLabels)).toEqual(['Sexo: NOVO'])
  })

  it('a tela pode dizer um filtro melhor que o catálogo (o nome do curso)', () => {
    expect(filtrosEmPalavras(
      { courseIds: ['c1'] }, catalogoInscricoes().filterLabels, { textos: { courseIds: 'Curso: Horta Orgânica' } },
    )).toEqual(['Curso: Horta Orgânica'])
    // Sem o filtro, o texto da tela não aparece.
    expect(filtrosEmPalavras({ courseIds: [] }, catalogoInscricoes().filterLabels, { textos: { courseIds: 'Curso: X' } }))
      .toEqual([])
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

  it('total desconhecido ou "Só confirmadas" sem a contagem deixa a API decidir', () => {
    expect(problemaParaBaixar(estado({ format: 'pdf' }), cat, { selecionados: 0 })).toBeNull()
    expect(problemaParaBaixar(estado({ format: 'pdf', confirmed: true }), cat, { total: 5000, selecionados: 0 })).toBeNull()
  })

  it('"Só confirmadas" com a contagem: nenhuma confirmada não baixa; o limite vale para as confirmadas', () => {
    const insc = catalogoInscricoes()
    expect(problemaParaBaixar(estado({ confirmed: true }), insc, { total: 4, selecionados: 0, totalConfirmadas: 0 }))
      .toBe(TEXTO_NENHUMA_CONFIRMADA)
    expect(problemaParaBaixar(estado({ confirmed: true }), insc, { total: 4, selecionados: 0, totalConfirmadas: 3 })).toBeNull()
    expect(problemaParaBaixar(estado({ confirmed: true, format: 'pdf' }), insc, { total: 9000, selecionados: 0, totalConfirmadas: 2500 }))
      .toMatch(/O PDF aceita/)
    // Sem nenhuma inscrição, o teto já diz que não há o que baixar.
    expect(problemaParaBaixar(estado({ confirmed: true }), insc, { total: 0, selecionados: 0 })).toBe('Nenhum registro para exportar.')
  })

  it('lista vazia não baixa', () => {
    expect(problemaParaBaixar(estado(), cat, { total: 0, selecionados: 0 })).toBe('Nenhum registro para exportar.')
  })
})

describe('fase 2: filtros das outras fontes em palavras (SR-101)', () => {
  const cursos = { view: 'Aba', search: 'Busca', year: 'Ano', status: 'Status' }

  it('cursos: a aba pelo nome da tela e o ano como número, na ordem da API', () => {
    expect(filtrosEmPalavras({ view: 'stored', search: 'horta', year: 2026 }, cursos))
      .toEqual(['Aba: Armazenados', 'Busca: horta', 'Ano: 2026'])
    expect(filtrosEmPalavras({ view: 'upcoming', search: '', year: undefined }, cursos)).toEqual(['Aba: Próximos'])
  })

  it('false só aparece com o texto da tela ("Só não parceiras", "Só não lidas")', () => {
    const empresas = { search: 'Busca', type: 'Tipo', isPartner: 'Só parceiras' }
    expect(filtrosEmPalavras({ isPartner: false }, empresas)).toEqual([])
    expect(filtrosEmPalavras({ isPartner: false }, empresas, { textos: { isPartner: 'Só não parceiras' } }))
      .toEqual(['Só não parceiras'])
    expect(filtrosEmPalavras({ isPartner: true }, empresas)).toEqual(['Só parceiras'])
    expect(filtrosEmPalavras({ read: 'false' }, { read: 'Só lidas' }, { textos: { read: 'Só não lidas' } }))
      .toEqual(['Só não lidas'])
    // O texto da tela não inventa filtro: sem valor, nada.
    expect(filtrosEmPalavras({ isPartner: undefined }, empresas, { textos: { isPartner: 'Só não parceiras' } }))
      .toEqual([])
  })

  it('o tipo da empresa não está no mapa global (a chave `type` também é das reservas)', () => {
    expect(filtrosEmPalavras({ type: 'PRIVATE' }, { type: 'Tipo' })).toEqual(['Tipo: PRIVATE'])
    expect(filtrosEmPalavras({ type: 'PRIVATE' }, { type: 'Tipo' }, { textos: { type: 'Tipo: Privada' } }))
      .toEqual(['Tipo: Privada'])
  })
})

describe('PDF rápido do menu: as colunas de sempre (SR-101)', () => {
  it('escolhe do Padrão os nomes preferidos, na ordem do Padrão, sem campo sem permissão', () => {
    // Padrão do recorte: Nome, Apelido, CPF, RG (sem permissão), Nascimento, E-mail, Telefone.
    expect(camposDoResumo(cat)).toEqual(['name', 'cpf', 'email', 'phone'])
    expect(camposDoResumo(catalogoInscricoes())).toEqual(['name', 'cpf', 'email', 'phone'])
    expect(MODELO_RESUMO).toBe('Resumo')
  })

  it('sem nenhum nome preferido, leva as primeiras colunas do Padrão (até 7), como o PDF do CSV', () => {
    const c = lerCatalogo({
      groups: [{ name: 'G', fields: 'abcdefghij'.split('').map(k => ({ key: k, label: k.toUpperCase() })) }],
      padrao: 'jihgfedcba'.split(''),
    })!
    expect(camposDoResumo(c)).toEqual(['j', 'i', 'h', 'g', 'f', 'e', 'd'])
  })

  it('até 7 colunas', () => {
    const rotulos = ['Nome', 'CPF', 'Telefone', 'E-mail', 'Situação de associado', 'Associado em dia', 'Associado até', 'Tipo de membro', 'Cidade']
    const c = lerCatalogo({
      groups: [{ name: 'G', fields: rotulos.map((label, i) => ({ key: `k${i}`, label })) }],
      padrao: rotulos.map((_, i) => `k${i}`),
    })!
    expect(camposDoResumo(c)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6'])
  })
})

describe('fase 2, parte B: período, Financeiro e Auditoria (SR-103)', () => {
  it('o período em dias sai como a API escreve no PDF', () => {
    expect(periodoEmPalavras('2026-01-01', '2026-01-31')).toBe('Período: 01/01/2026 a 31/01/2026')
    expect(periodoEmPalavras('2026-10-05', '2026-10-05')).toBe('Dia: 05/10/2026')
    expect(periodoEmPalavras('2026-10-05', undefined)).toBe('De: 05/10/2026')
    expect(periodoEmPalavras(null, '2026-10-05')).toBe('Até: 05/10/2026')
    expect(periodoEmPalavras(undefined, '')).toBeNull()
    // Não é dia (AAAA-MM-DD): nada.
    expect(periodoEmPalavras('ontem', undefined)).toBeNull()
  })

  it('from e to viram uma parte só, no lugar do primeiro, na ordem da API', () => {
    const auditoria = catalogoAuditoria().filterLabels
    expect(filtrosEmPalavras(
      { action: 'export', entity: 'Usuário', actorId: 'a1', ip: undefined, from: '2026-01-01', to: '2026-01-31', q: 'joão' },
      auditoria,
      { textos: { action: 'Ação: Exportações', actorId: 'Quem: bali' } },
    )).toEqual(['Ação: Exportações', 'Área: Usuário', 'Quem: bali', 'Período: 01/01/2026 a 31/01/2026', 'Busca: joão'])
    expect(filtrosEmPalavras({ from: undefined, to: '2026-01-31' }, auditoria)).toEqual(['Até: 31/01/2026'])
    expect(filtrosEmPalavras({ to: '2026-10-05', from: '2026-10-05' }, { from: 'De', to: 'Até', roomId: 'Sala' }))
      .toEqual(['Dia: 05/10/2026'])
  })

  it('Financeiro: os filtros da tela na ordem da API, sem id', () => {
    expect(filtrosEmPalavras(
      { from: '2026-10-01', to: '2026-10-31', type: 'OUT', categoryId: 'c1', accountId: 'a1', method: 'PIX', search: 'coop', orderBy: 'number' },
      catalogoLancamentos().filterLabels,
      { textos: { type: 'Tipo: Saída', categoryId: 'Categoria: INSUMOS', accountId: 'Caixa: BANCO', orderBy: 'Ordem: Nº' } },
    )).toEqual([
      'Período: 01/10/2026 a 31/10/2026', 'Tipo: Saída', 'Categoria: INSUMOS', 'Caixa: BANCO', 'Método: PIX', 'Busca: coop', 'Ordem: Nº',
    ])
  })

  it('PDF rápido: Financeiro e Auditoria usam o modelo resumido da API', () => {
    expect(pdfRapido(catalogoLancamentos())).toEqual({
      fields: ['number', 'date', 'description', 'payeeName', 'amount'],
      rotulos: ['Nº', 'Data', 'Descrição', 'Nome / Razão social', 'Valor (R$)'],
      modelo: 'Resumido',
    })
    expect(pdfRapido(catalogoAuditoria())).toEqual({
      fields: ['createdAt', 'actor', 'action', 'target'],
      rotulos: ['Data e hora', 'Quem', 'Ação', 'Alvo'],
      modelo: 'Resumida',
    })
  })

  it('PDF rápido: as outras fontes continuam com as colunas de sempre e o "Resumo"', () => {
    expect(pdfRapido(cat)).toEqual({
      fields: ['name', 'cpf', 'email', 'phone'], rotulos: ['Nome', 'CPF', 'E-mail', 'Telefone'], modelo: MODELO_RESUMO,
    })
    // Sem o modelo resumido no catálogo (back de outra versão), volta às colunas de sempre.
    const semModelo = catalogoLancamentos({ modelos: [] })
    expect(pdfRapido(semModelo)).toMatchObject({ fields: ['date', 'description'], modelo: MODELO_RESUMO })
  })

  it('PDF rápido pela API só até o limite de linhas do PDF (total conhecido)', () => {
    expect(pdfRapidoPelaApi(cat, 2000)).toBe(true)
    expect(pdfRapidoPelaApi(cat, 2001)).toBe(false)
    expect(pdfRapidoPelaApi(cat, undefined)).toBe(true)
    expect(pdfRapidoPelaApi(catalogoPessoas({ limits: { rows: 20000, pdfRows: 10, fields: 80 } }), 11)).toBe(false)
  })

  it('a Auditoria corta nas 20.000 mais recentes: conta as que saem e não trava', () => {
    const aud = catalogoAuditoria()
    expect(totalComCorte(25000, aud, true)).toBe(20000)
    expect(totalComCorte(25000, aud, false)).toBe(25000)
    expect(totalComCorte(undefined, aud, true)).toBeUndefined()
    expect(avisoDoCorte(25000, aud, true)).toBe('Saem só as 20.000 linhas mais recentes.')
    expect(avisoDoCorte(20000, aud, true)).toBeNull()
    expect(avisoDoCorte(25000, aud, false)).toBeNull()
    // Com o total cortado, a planilha baixa; o PDF continua com o limite de 2.000.
    const csv = estado({ fields: ['createdAt'], modeloId: null })
    expect(problemaParaBaixar(csv, aud, { total: totalComCorte(25000, aud, true), selecionados: 0 })).toBeNull()
    expect(problemaParaBaixar({ ...csv, format: 'pdf' }, aud, { total: totalComCorte(25000, aud, true), selecionados: 0 }))
      .toMatch(/O PDF aceita/)
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
