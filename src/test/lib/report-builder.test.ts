import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  aplicarModelo, avisoDadosPessoais, avisoDoCorte, camposDoResumo, caminhoDoPdfRapido, chaveDoUltimo, contagem, ehPdf,
  estadoInicial, filtrarGrupos, filtrosEmPalavras, formatoDaApi, formatoNaTela, guardarFormatoDaPlanilha, guardarUltimo,
  lerCatalogo, lerFormatoDaPlanilha, lerUltimo, limparCampos, marcarCampo, modeloParaApi, modelosDe, moverCampo,
  moverPara, nomeDoModelo, pdfRapido, pdfRapidoPelaApi, periodoEmPalavras, problemaParaBaixar, quantosVaoSair,
  temPdfDoCsv, textoDoBaixado, textoDoBotao, textoDoLimiteDoPdf, tirarCampo, totalComCorte,
  CHAVE_DA_PLANILHA, MODELO_RESUMO, PADRAO_ID, PADRAO_NOME, TEXTO_NENHUMA_CONFIRMADA, TEXTO_PDF_SEM_CATALOGO,
  type ReportState,
} from '@/components/export/report-builder'
import {
  autoriaDoModelo, comModelo, corpoDoModelo, ehDaEquipe, idDaEquipe, lerModeloDaEquipe, lerModelosDaEquipe,
  modeloAlterado, modeloAtual, mudouDoModelo, normalizarNome, problemaDoNome, semModelo, travaDoModelo,
  ultimoDoEstado, type ModeloDaEquipe,
} from '@/components/export/report-builder'
import {
  CATALOGO_PESSOAS_CRU, catalogoAuditoria, catalogoInscricoes, catalogoLancamentos, catalogoPessoas, modeloDaEquipeCru,
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

  /** Catálogo com o Padrão da API, na ordem dela (chave e rótulo). */
  function catalogoDe(dataset: string, padrao: [string, string][]) {
    return lerCatalogo({
      dataset,
      groups: [{ name: 'G', fields: padrao.map(([key, label]) => ({ key, label })) }],
      padrao: padrao.map(([key]) => key),
    })!
  }

  it('Cursos e Propriedades levam o nome do registro, em pé (até 5 colunas) (SR-111)', () => {
    // O Padrão de cada fonte, como a API manda (back 123334f).
    const cursos = catalogoDe('courses', [
      ['name', 'Curso'], ['eventNumber', 'Nº do evento'], ['status', 'Status'], ['startTime', 'Início'],
      ['endTime', 'Término'], ['registrationDeadline', 'Inscrições até'], ['room', 'Sala'],
      ['roomCapacity', 'Capacidade da sala'], ['instructors', 'Instrutores'], ['workloadHours', 'Carga horária (h)'],
      ['price', 'Valor (R$)'], ['minStudents', 'Mínimo de alunos'], ['enrolled', 'Inscritos'],
      ['confirmedCount', 'Confirmados'], ['preEnrolled', 'Pré-inscritos'], ['waitlist', 'Lista de espera'],
      ['description', 'Descrição'], ['observations', 'Observações'], ['createdAt', 'Criado em'],
    ])
    expect(camposDoResumo(cursos)).toEqual(['name', 'eventNumber', 'startTime', 'description'])
    expect(pdfRapido(cursos)?.rotulos).toEqual(['Curso', 'Nº do evento', 'Início', 'Descrição'])

    const propriedades = catalogoDe('properties', [
      ['name', 'Propriedade'], ['registration', 'Matrícula'], ['ownerKind', 'Dono'], ['ownerName', 'Nome do dono'],
      ['ownerDocument', 'CPF/CNPJ'], ['isPrimary', 'Principal'], ['addressType', 'Tipo'], ['addressStreet', 'Rua'],
      ['addressNumber', 'Número'], ['addressComplement', 'Complemento'], ['addressNeighborhood', 'Bairro'],
      ['addressLocality', 'Localidade'], ['addressRoad', 'Estrada'], ['addressKm', 'Km'], ['addressLot', 'Lote'],
      ['addressSection', 'Seção'], ['addressCity', 'Cidade'], ['addressState', 'UF'], ['addressZipCode', 'CEP'],
      ['addressNotes', 'Observações do endereço'], ['createdAt', 'Cadastrada em'],
    ])
    expect(camposDoResumo(propriedades)).toEqual(['name', 'registration', 'ownerName', 'addressCity'])
    // Acima de 2.000 linhas o PDF sai do CSV com os mesmos rótulos.
    expect(caminhoDoPdfRapido('properties', propriedades, 2001)).toEqual({
      via: 'csv', colunasDoPdf: ['Propriedade', 'Matrícula', 'Nome do dono', 'Cidade'],
    })
  })

  it('"Curso" só entra no PDF de Cursos: nas inscrições o PDF já é de um curso só', () => {
    const inscricoes = catalogoDe('registrations', [
      ['course', 'Curso'], ['eventNumber', 'Nº do evento'], ['courseStart', 'Início do curso'], ['name', 'Nome'],
      ['cpf', 'CPF'], ['email', 'E-mail'], ['phone', 'Telefone'],
    ])
    expect(camposDoResumo(inscricoes)).toEqual(['eventNumber', 'name', 'cpf', 'email', 'phone'])
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
    )).toEqual(['Ação: Exportações', 'Tipo: Usuário', 'Quem: bali', 'Período: 01/01/2026 a 31/01/2026', 'Busca: joão'])
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
      'Período: 01/10/2026 a 31/10/2026', 'Tipo: Saída', 'Categoria: INSUMOS', 'Caixa: BANCO', 'Forma de pagamento: PIX', 'Busca: coop', 'Ordem: Nº',
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
    // No menu Exportar, antes de o catálogo chegar: o limite da API.
    expect(avisoDoCorte(25000, null, true)).toBe('Saem só as 20.000 linhas mais recentes.')
    expect(avisoDoCorte(20000, null, true)).toBeNull()
    // Com o total cortado, a planilha baixa; o PDF continua com o limite de 2.000.
    const csv = estado({ fields: ['createdAt'], modeloId: null })
    expect(problemaParaBaixar(csv, aud, { total: totalComCorte(25000, aud, true), selecionados: 0 })).toBeNull()
    expect(problemaParaBaixar({ ...csv, format: 'pdf' }, aud, { total: totalComCorte(25000, aud, true), selecionados: 0 }))
      .toMatch(/O PDF aceita/)
  })
})

describe('Excel (SR-106)', () => {
  it('o formato da API: Imprimir é o PDF; Excel e CSV vão como são', () => {
    expect(formatoDaApi('csv')).toBe('csv')
    expect(formatoDaApi('xlsx')).toBe('xlsx')
    expect(formatoDaApi('pdf')).toBe('pdf')
    expect(formatoDaApi('print')).toBe('pdf')
    expect([ehPdf('csv'), ehPdf('xlsx'), ehPdf('pdf'), ehPdf('print')]).toEqual([false, false, true, true])
  })

  it('o Excel tem o limite da planilha (20.000), não o do PDF', () => {
    const xlsx = estado({ format: 'xlsx' })
    expect(problemaParaBaixar(xlsx, cat, { total: 5000, selecionados: 0 })).toBeNull()
    expect(problemaParaBaixar(xlsx, cat, { total: 20001, selecionados: 0 })).toMatch(/passa de 20.000 linhas/)
    expect(problemaParaBaixar(estado({ format: 'pdf' }), cat, { total: 5000, selecionados: 0 }))
      .toBe('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')
  })

  it('o botão e o aviso depois de baixar dizem "do Excel", com milhar', () => {
    expect(textoDoBotao('xlsx', { n: 2500, teto: false })).toBe('Baixar planilha do Excel (2.500)')
    expect(textoDoBotao('csv', { n: 2500, teto: false })).toBe('Baixar planilha (2.500)')
    expect(textoDoBaixado('xlsx', 2500)).toBe('Planilha do Excel com 2.500 registros baixada.')
    expect(textoDoBaixado('xlsx', 1)).toBe('Planilha do Excel com 1 registro baixada.')
    expect(textoDoBaixado('csv', -1)).toBe('Planilha baixada.')
    expect(textoDoBaixado('pdf', 3)).toBe('Relatório com 3 registros baixado.')
  })

  it('o último relatório lembra o Excel', () => {
    localStorage.clear()
    guardarUltimo('people', { fields: ['name'], format: 'xlsx' })
    expect(lerUltimo('people')).toEqual({ fields: ['name'], format: 'xlsx' })
    expect(estadoInicial(cat, { ultimo: lerUltimo('people') }).format).toBe('xlsx')
  })

  it('a planilha rápida do menu: CSV até a pessoa escolher o Excel, lembrado para todas as listas', () => {
    localStorage.clear()
    expect(lerFormatoDaPlanilha()).toBe('csv')
    guardarFormatoDaPlanilha('xlsx')
    expect(localStorage.getItem(CHAVE_DA_PLANILHA)).toBe('xlsx')
    expect(lerFormatoDaPlanilha()).toBe('xlsx')
    localStorage.setItem(CHAVE_DA_PLANILHA, 'ods')
    expect(lerFormatoDaPlanilha()).toBe('csv')
  })
})

describe('PDF rápido: por onde sai (SR-106)', () => {
  const resumoPessoas = ['Nome', 'CPF', 'E-mail', 'Telefone']

  it('só as fontes que já tinham PDF voltam ao PDF do CSV', () => {
    expect(temPdfDoCsv('people')).toBe(true)
    expect(temPdfDoCsv('room-bookings')).toBe(true)
    expect(temPdfDoCsv('finance-transactions')).toBe(false)
    expect(temPdfDoCsv('audit-logs')).toBe(false)
  })

  it('até o limite (ou sem saber quantos): pela API; o pedido de novo do CSV só onde já havia PDF', () => {
    expect(caminhoDoPdfRapido('people', cat, 2000)).toEqual({
      via: 'api', fields: ['name', 'cpf', 'email', 'phone'], modelo: 'Resumo', doCsv: { colunasDoPdf: resumoPessoas },
    })
    expect(caminhoDoPdfRapido('people', cat, undefined)).toMatchObject({ via: 'api' })
    const lanc = caminhoDoPdfRapido('finance-transactions', catalogoLancamentos(), undefined)
    expect(lanc).toEqual({ via: 'api', fields: ['number', 'date', 'description', 'payeeName', 'amount'], modelo: 'Resumido' })
  })

  it('acima do limite: PDF do CSV onde já havia PDF; aviso da API no Financeiro e na Auditoria', () => {
    expect(caminhoDoPdfRapido('people', cat, 2001)).toEqual({ via: 'csv', colunasDoPdf: resumoPessoas })
    expect(caminhoDoPdfRapido('finance-transactions', catalogoLancamentos(), 2500)).toEqual({
      via: 'aviso', mensagem: 'O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.',
    })
    expect(caminhoDoPdfRapido('audit-logs', catalogoAuditoria(), 25000)).toMatchObject({ via: 'aviso' })
    expect(textoDoLimiteDoPdf(500)).toBe('O PDF aceita até 500 linhas. Baixe a planilha ou use um filtro.')
  })

  it('sem catálogo: PDF do CSV onde já havia PDF; no Financeiro e na Auditoria, nada de desenhar sem saber as colunas', () => {
    expect(caminhoDoPdfRapido('people', null, 10)).toEqual({ via: 'csv' })
    expect(caminhoDoPdfRapido('people', null, 2500)).toEqual({ via: 'csv' })
    expect(caminhoDoPdfRapido('audit-logs', null, 10)).toEqual({ via: 'aviso', mensagem: TEXTO_PDF_SEM_CATALOGO })
    expect(caminhoDoPdfRapido('finance-transactions', null, 2500)).toMatchObject({ via: 'aviso', mensagem: /2\.000 linhas/ })
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

describe('modelos da equipe (fase 3, SR-115)', () => {
  const t = (over: Record<string, unknown> = {}): ModeloDaEquipe => lerModeloDaEquipe(modeloDaEquipeCru(over))!
  const equipe = [t()]
  const ID = idDaEquipe('t1')

  describe('lerModelosDaEquipe', () => {
    it('lê a resposta da API e deixa de fora o que não é modelo', () => {
      const lista = lerModelosDaEquipe([modeloDaEquipeCru(), { id: 'x' }, null, 'lixo'])
      expect(lista).toEqual([{
        id: 't1', dataset: 'people', name: 'Telefones da equipe', fields: ['name', 'phone'], missingFields: [],
        format: 'pdf', confirmed: null, createdAt: '2026-11-10T13:00:00.000Z', updatedAt: '2026-11-10T13:00:00.000Z',
        createdBy: { id: 'a1', username: 'gestor' }, updatedBy: null,
      }])
      expect(lerModelosDaEquipe({ error: 'Forbidden' })).toEqual([])
    })

    it('formato desconhecido vira "sem preferência" e usuário vazio vira null', () => {
      const m = t({ format: 'docx', createdBy: { id: 'a1', username: '' }, updatedBy: { id: 'a2', username: null } })
      expect(m.format).toBeNull()
      expect(m.createdBy).toEqual({ id: 'a1', username: null })
      expect(m.updatedBy).toEqual({ id: 'a2', username: null })
    })
  })

  describe('no seletor', () => {
    it('vêm depois dos de fábrica, com id próprio e as chaves que saíram do catálogo', () => {
      const m = modelosDe(cat, [t({ missingFields: ['velho'] })])
      expect(m[0].id).toBe(PADRAO_ID)
      const ultimo = m.at(-1)!
      expect(ultimo).toMatchObject({ id: 'equipe:t1', name: 'Telefones da equipe', fields: ['name', 'phone', 'velho'], format: 'pdf' })
      expect(ultimo.daEquipe?.id).toBe('t1')
      expect(ehDaEquipe(ultimo.id)).toBe(true)
      expect(ehDaEquipe('nome-cpf')).toBe(false)
      expect(ehDaEquipe(null)).toBe(false)
    })

    it('id de fábrica igual ao do modelo da equipe não se confunde', () => {
      const m = modelosDe(cat, [t({ id: 'nome-cpf', name: 'Outro' })])
      expect(m.filter(x => x.id === 'nome-cpf').map(x => x.name)).toEqual(['Nome e CPF'])
    })
  })

  describe('aplicar', () => {
    it('aplica as colunas e o formato do modelo', () => {
      const s = aplicarModelo(estado({ format: 'csv' }), cat, ID, equipe)
      expect(s).toMatchObject({ fields: ['name', 'phone'], modeloId: ID, format: 'pdf', avisos: [] })
      expect(nomeDoModelo(s, cat, equipe)).toBe('Telefones da equipe')
    })

    it('"Imprimir" continua quando o modelo é PDF; sem formato, o formato não muda', () => {
      expect(aplicarModelo(estado({ format: 'print' }), cat, ID, equipe).format).toBe('print')
      expect(aplicarModelo(estado({ format: 'xlsx' }), cat, ID, [t({ format: null })]).format).toBe('xlsx')
    })

    it('campo sem permissão e campo que saiu do catálogo ficam de fora, com aviso', () => {
      const s = aplicarModelo(estado(), cat, ID, [t({ fields: ['name', 'rg'], missingFields: ['velho'] })])
      expect(s.fields).toEqual(['name'])
      expect(s.avisos).toEqual([
        'Ficaram de fora campos do modelo que você não pode exportar: RG.',
        '1 campo do modelo não existe mais e saiu.',
      ])
      expect(nomeDoModelo(s, cat, [t({ fields: ['name', 'rg'], missingFields: ['velho'] })])).toBe('Telefones da equipe')
    })

    it('"Só confirmadas" segue o modelo da equipe nas inscrições', () => {
      const insc = catalogoInscricoes()
      const presenca = [t({ dataset: 'registrations', fields: ['name', 'cpf'], confirmed: true })]
      expect(aplicarModelo(estado(), insc, ID, presenca).confirmed).toBe(true)
      expect(aplicarModelo(estado({ confirmed: true }), insc, ID, [t({ fields: ['name'], confirmed: false })]).confirmed).toBe(false)
    })

    it('sem a lista (ainda carregando ou não carregou), o modelo da equipe não existe', () => {
      const s = estado({ modeloId: ID, fields: ['name', 'phone'] })
      expect(aplicarModelo(estado(), cat, ID)).toEqual(estado())
      expect(modeloAtual(s, cat)).toBeNull()
      expect(nomeDoModelo(s, cat)).toBeNull()
      expect(modeloParaApi(s, cat)).toBeUndefined()
    })
  })

  describe('mudouDoModelo (oferece salvar por cima)', () => {
    const modelo = modelosDe(cat, equipe).at(-1)!
    const aberto = estado({ fields: ['name', 'phone'], modeloId: ID, format: 'pdf' })

    it('igual ao modelo, não', () => {
      expect(mudouDoModelo(aberto, cat, modelo, 'people')).toBe(false)
      // Imprimir é o mesmo PDF.
      expect(mudouDoModelo({ ...aberto, format: 'print' }, cat, modelo, 'people')).toBe(false)
    })

    it('colunas, formato ou "Só confirmadas" diferentes, sim', () => {
      expect(mudouDoModelo({ ...aberto, fields: ['phone', 'name'] }, cat, modelo, 'people')).toBe(true)
      expect(mudouDoModelo({ ...aberto, format: 'xlsx' }, cat, modelo, 'people')).toBe(true)
      expect(mudouDoModelo({ ...aberto, confirmed: true }, cat, modelo, 'registrations')).toBe(true)
      // Fora das inscrições o "Só confirmadas" não existe.
      expect(mudouDoModelo({ ...aberto, confirmed: true }, cat, modelo, 'people')).toBe(false)
    })

    it('modelo sem formato: o formato da tela não conta', () => {
      const semFormato = modelosDe(cat, [t({ format: null })]).at(-1)!
      expect(mudouDoModelo({ ...aberto, format: 'csv' }, cat, semFormato, 'people')).toBe(false)
    })
  })

  it('travaDoModelo: campo que a pessoa não pode exportar trava mudar e excluir; o que saiu do catálogo não', () => {
    expect(travaDoModelo(cat, t())).toBeNull()
    expect(travaDoModelo(cat, t({ missingFields: ['velho'] }))).toBeNull()
    expect(travaDoModelo(cat, t({ fields: ['name', 'rg'] })))
      .toBe('Você não pode mudar nem excluir este modelo, porque ele tem campos que você não pode exportar: RG.')
  })

  it('autoriaDoModelo: quem criou e quem editou, no dia de Brasília', () => {
    expect(autoriaDoModelo(t())).toBe('Modelo da equipe, criado por gestor em 10/11/2026.')
    // 01h UTC do dia 12 ainda é dia 11 em Brasília.
    expect(autoriaDoModelo(t({ updatedBy: { id: 'a2', username: 'bali' }, updatedAt: '2026-11-12T01:00:00.000Z' })))
      .toBe('Modelo da equipe, criado por gestor em 10/11/2026 e editado por bali em 11/11/2026.')
    expect(autoriaDoModelo(t({ createdBy: { id: 'a1', username: null } }))).toBe('Modelo da equipe, criado em 10/11/2026.')
  })

  it('o nome: espaços juntados, vazio e comprido recusados como a API', () => {
    expect(normalizarNome('  CPFs \t da\n diretoria ')).toBe('CPFs da diretoria')
    expect(problemaDoNome('   ')).toBe('Informe o nome do modelo.')
    expect(problemaDoNome('x'.repeat(65))).toBe('O nome do modelo pode ter até 64 caracteres.')
    expect(problemaDoNome(` ${'x'.repeat(64)} `)).toBeNull()
  })

  it('corpoDoModelo: colunas e formato de agora ("Imprimir" vira PDF); "Só confirmadas" só nas inscrições', () => {
    const s = estado({ fields: ['name'], format: 'print', confirmed: true })
    expect(corpoDoModelo(s, 'people')).toEqual({ fields: ['name'], format: 'pdf' })
    expect(corpoDoModelo(s, 'registrations')).toEqual({ fields: ['name'], format: 'pdf', confirmed: true })
  })

  it('comModelo e semModelo: a lista na ordem da API, pelo nome', () => {
    const lista = [t({ id: 'b', name: 'beta' }), t({ id: 'z', name: 'Zeta' })]
    expect(comModelo(lista, t({ id: 'a', name: 'Álcool' })).map(m => m.name)).toEqual(['Álcool', 'beta', 'Zeta'])
    expect(comModelo(lista, t({ id: 'z', name: 'Abc' })).map(m => m.id)).toEqual(['z', 'b'])
    expect(semModelo(lista, 'b').map(m => m.id)).toEqual(['z'])
  })

  describe('modeloParaApi', () => {
    it('o nome do modelo da equipe, com "(alterado)" se mudou', () => {
      const s = aplicarModelo(estado(), cat, ID, equipe)
      expect(modeloParaApi(s, cat, equipe)).toBe('Telefones da equipe')
      expect(modeloParaApi(tirarCampo(s, 'phone'), cat, equipe)).toBe('Telefones da equipe (alterado)')
    })

    it('nome de 64 com "(alterado)": encurta o nome e não perde o "(alterado)"', () => {
      const longo = [t({ name: 'x'.repeat(64) })]
      const s = tirarCampo(aplicarModelo(estado(), cat, ID, longo), 'phone')
      const enviado = modeloParaApi(s, cat, longo)!
      expect(enviado).toHaveLength(64)
      expect(enviado.endsWith('… (alterado)')).toBe(true)
      expect(modeloParaApi(aplicarModelo(estado(), cat, ID, longo), cat, longo)).toBe('x'.repeat(64))
    })
  })

  describe('o último usado com o modelo', () => {
    beforeEach(() => {
      // O teste do navegador sem storage, acima, deixa o setItem quebrado.
      vi.restoreAllMocks()
      localStorage.clear()
    })

    it('guarda o modelo aberto e se as colunas mudaram dele', () => {
      const s = aplicarModelo(estado(), cat, ID, equipe)
      expect(ultimoDoEstado(s, cat, equipe)).toEqual({ fields: ['name', 'phone'], format: 'pdf', modelo: ID, alterado: false })
      const mexido = tirarCampo(s, 'phone')
      expect(modeloAlterado(mexido, cat, equipe)).toBe(true)
      guardarUltimo('people', ultimoDoEstado(mexido, cat, equipe))
      expect(lerUltimo('people')).toEqual({ fields: ['name'], format: 'pdf', modelo: ID, alterado: true })
      // Montado à mão: sem modelo.
      expect(ultimoDoEstado(estado({ modeloId: null }), cat)).toEqual({ fields: ['name', 'cpf'], format: 'csv' })
    })

    it('modelo da equipe usado sem mexer: abre como ele está agora', () => {
      const s = estadoInicial(cat, {
        ultimo: { fields: ['name', 'phone'], format: 'csv', modelo: ID, alterado: false },
        equipe: [t({ fields: ['name', 'phone', 'email'] })],
      })
      expect(s).toMatchObject({ fields: ['name', 'phone', 'email'], modeloId: ID, format: 'csv' })
    })

    it('modelo da equipe usado com mudança: abre as colunas guardadas, como "(alterado)"', () => {
      const s = estadoInicial(cat, { ultimo: { fields: ['phone'], format: 'pdf', modelo: ID, alterado: true }, equipe })
      expect(s).toMatchObject({ fields: ['phone'], modeloId: ID })
      expect(nomeDoModelo(s, cat, equipe)).toBe('Telefones da equipe (alterado)')
    })

    it('modelo da equipe excluído: abre as colunas guardadas, sem o nome', () => {
      const s = estadoInicial(cat, { ultimo: { fields: ['phone', 'email'], format: 'pdf', modelo: idDaEquipe('foi'), alterado: false }, equipe })
      expect(s).toMatchObject({ fields: ['phone', 'email'], modeloId: null, format: 'pdf' })
      // Se as colunas batem com outro modelo, abre com o nome dele.
      const bate = estadoInicial(cat, { ultimo: { fields: ['name', 'cpf'], format: 'pdf', modelo: idDaEquipe('foi') }, equipe: [] })
      expect(bate.modeloId).toBe('nome-cpf')
    })

    it('lista ainda carregando: as colunas guardadas e o id à espera da lista', () => {
      const s = estadoInicial(cat, { ultimo: { fields: ['phone'], format: 'pdf', modelo: ID, alterado: false } })
      expect(s).toMatchObject({ fields: ['phone'], modeloId: ID })
      expect(nomeDoModelo(s, cat)).toBeNull()
    })

    it('modelo de fábrica guardado com mudança volta como "(alterado)"', () => {
      const s = estadoInicial(cat, { ultimo: { fields: ['name', 'cpf', 'email'], format: 'csv', modelo: 'nome-cpf', alterado: true } })
      expect(nomeDoModelo(s, cat)).toBe('Nome e CPF (alterado)')
    })

    it('o "Só confirmadas" volta com o modelo da equipe das inscrições', () => {
      const insc = catalogoInscricoes()
      const presenca = [t({ dataset: 'registrations', fields: ['name', 'cpf'], confirmed: true })]
      const s = estadoInicial(insc, { ultimo: { fields: ['name', 'cpf'], format: 'pdf', modelo: ID, alterado: false }, equipe: presenca })
      expect(s.confirmed).toBe(true)
    })

    it('o que foi guardado antes da SR-115 (sem modelo) continua valendo', () => {
      localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: ['name', 'email'], format: 'pdf' }))
      expect(lerUltimo('people')).toEqual({ fields: ['name', 'email'], format: 'pdf' })
      expect(estadoInicial(cat, { ultimo: lerUltimo('people'), equipe }).modeloId).toBe('nome-email')
    })
  })
})
