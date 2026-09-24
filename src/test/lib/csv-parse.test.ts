import { describe, it, expect } from 'vitest'
import { parseCsv, parseCsvSections, pdfColumns, pesoDaColuna } from '@/lib/csv-parse'

// O backend gera: BOM, separador ";", CRLF e toda célula entre aspas.
const csv = (linhas: string[]) => `\ufeff${linhas.join('\r\n')}\r\n`
const q = (celulas: string[]) => celulas.map(c => `"${c}"`).join(';')

describe('parseCsv', () => {
  it('lê a planilha do backend, com BOM e CRLF', () => {
    const texto = csv([q(['Nome', 'CPF']), q(['Maria', '123'])])
    expect(parseCsv(texto)).toEqual([['Nome', 'CPF'], ['Maria', '123']])
  })

  it('ponto e vírgula dentro das aspas não quebra a célula', () => {
    // Observações e listas ("A | B") podem trazer o separador no meio.
    const texto = csv([q(['Nome', 'Observações']), q(['Maria', 'veio; depois saiu'])])
    expect(parseCsv(texto)[1]).toEqual(['Maria', 'veio; depois saiu'])
  })

  it('aspas dobradas viram uma aspa só', () => {
    const texto = csv([q(['Nome']), '"Sítio ""Boa Vista"""'])
    expect(parseCsv(texto)[1]).toEqual(['Sítio "Boa Vista"'])
  })

  it('quebra de linha dentro das aspas fica na mesma célula', () => {
    const texto = `"Nome";"Obs"\r\n"Maria";"linha 1\r\nlinha 2"\r\n`
    expect(parseCsv(texto)).toEqual([['Nome', 'Obs'], ['Maria', 'linha 1\nlinha 2']])
  })

  it('célula vazia continua sendo uma coluna', () => {
    expect(parseCsv('"a";"";"c"')).toEqual([['a', '', 'c']])
  })

  it('texto vazio não vira linha', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('\ufeff')).toEqual([])
  })
})

describe('parseCsvSections', () => {
  it('planilha comum vira uma tabela sem título', () => {
    const texto = csv([q(['Nome', 'CPF']), q(['Maria', '1']), q(['João', '2'])])
    expect(parseCsvSections(texto)).toEqual([
      { title: null, header: ['Nome', 'CPF'], rows: [['Maria', '1'], ['João', '2']] },
    ])
  })

  it('o relatório consolidado vira uma tabela por seção', () => {
    // Linha de uma célula só = título da seção (nenhuma planitha exportada
    // tem uma coluna só, então não há como confundir com dado).
    const texto = csv([
      q(['PESSOAS FISICAS']), q(['Nome', 'CPF']), q(['Maria', '1']),
      '',
      q(['PESSOAS JURIDICAS']), q(['Razão social', 'CNPJ']), q(['Agro ME', '9']),
    ])
    const secoes = parseCsvSections(texto)
    expect(secoes.map(s => s.title)).toEqual(['PESSOAS FISICAS', 'PESSOAS JURIDICAS'])
    expect(secoes[0].rows).toEqual([['Maria', '1']])
    expect(secoes[1].header).toEqual(['Razão social', 'CNPJ'])
  })

  it('seção sem nenhum registro continua aparecendo', () => {
    // "Nenhum administrador" é informação: some do relatório seria pior.
    const texto = csv([q(['ADMINISTRADORES']), q(['Nome', 'Usuário'])])
    expect(parseCsvSections(texto)).toEqual([
      { title: 'ADMINISTRADORES', header: ['Nome', 'Usuário'], rows: [] },
    ])
  })

  it('seção sem cabeçalho nenhum é descartada', () => {
    expect(parseCsvSections(csv([q(['SÓ O TÍTULO'])]))).toEqual([])
  })
})

describe('pdfColumns', () => {
  it('escolhe as colunas que identificam a pessoa, na ordem da planilha', () => {
    const header = ['Nome', 'Apelido', 'CPF', 'RG', 'Sexo', 'Telefone', 'E-mail', 'Etnia']
    expect(pdfColumns(header).map(i => header[i])).toEqual(['Nome', 'CPF', 'Telefone', 'E-mail'])
  })

  it('nunca passa de 7 colunas: mais que isso não se lê no papel', () => {
    const header = [
      'Nome', 'CPF', 'Telefone', 'E-mail', 'Tipo de membro', 'Situação de associado',
      'Associado em dia', 'Associado até', 'Cidade',
    ]
    expect(pdfColumns(header).length).toBeLessThanOrEqual(7)
  })

  it('cabeçalho desconhecido leva as primeiras colunas', () => {
    const header = ['Alfa', 'Beta', 'Gama']
    expect(pdfColumns(header)).toEqual([0, 1, 2])
  })

  it('empresa é reconhecida pela razão social e pelo CNPJ', () => {
    const header = ['Razão social', 'Nome fantasia', 'CNPJ', 'Sócios', 'Telefone']
    expect(pdfColumns(header).map(i => header[i]))
      .toEqual(['Razão social', 'Nome fantasia', 'CNPJ', 'Telefone'])
  })
})

describe('pesoDaColuna', () => {
  it('nome pesa mais que documento', () => {
    // Documento tem tamanho fixo e curto; nome é o que se procura na folha.
    expect(pesoDaColuna('Nome')).toBeGreaterThan(pesoDaColuna('CPF'))
    expect(pesoDaColuna('Razão social')).toBeGreaterThan(pesoDaColuna('CNPJ'))
    expect(pesoDaColuna('E-mail')).toBeGreaterThan(pesoDaColuna('Telefone'))
  })

  it('coluna desconhecida fica no meio termo', () => {
    const meio = pesoDaColuna('Coluna Nova')
    expect(meio).toBeGreaterThan(pesoDaColuna('CPF'))
    expect(meio).toBeLessThan(pesoDaColuna('Nome'))
  })

  it('as larguras de uma tabela de pessoas somam 100%', () => {
    const header = ['Nome', 'CPF', 'Telefone', 'E-mail']
    const pesos = header.map(pesoDaColuna)
    const soma = pesos.reduce((a, b) => a + b, 0)
    const larguras = pesos.map(p => (p / soma) * 100)
    expect(larguras.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    // O nome fica com a maior fatia.
    expect(Math.max(...larguras)).toBe(larguras[0])
  })
})
