// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer, renderToFile } from '@react-pdf/renderer'
import { NotaEmpenhoDocument, type NotaData } from '@/lib/nota-empenho-pdf'

// Mesmos dados da nota do legado usada como modelo (ne_pj.php?cod_pag=3144).
const pj: NotaData = {
  amountCents: 104277,
  date: '2026-09-01T00:00:00.000Z',
  description: 'PAGAMENTO DE MESES EM ATRASO E DO MES 09/26.',
  empenho: {
    numero: '3144',
    notaFiscal: '09/03/2026-09/05/2026-09/06/2026-09/07/2026-20/08/2026-09/09/2026',
    nomeFantasia: 'SANEPAR',
    razaoSocial: 'COMPANHIA DE SANEAMENTO DO PARANA',
    cnpjCpf: '76.484.013/8008-06',
    inscricaoEstadual: '101.80080-64',
    endereco: 'RUA ENGENHEIRO REBOLCAS , 1376',
    cep: '80.215-900',
    cidade: 'CURITIBA',
    uf: 'PR',
    descontoCents: 0,
    banco: 'SICOOB',
    conta: '4841-0',
    agencia: '4351-3',
    cheque: '1627',
  },
}

// Pessoa física: CPF no lugar do CNPJ, campos vazios em branco e textos digitados em minúsculas.
const pf: NotaData = {
  amountCents: 23000,
  date: '2026-09-15T00:00:00.000Z',
  description: 'Serviço de roçada no terreno da sede',
  empenho: {
    numero: '3150',
    nomeFantasia: '',
    razaoSocial: 'João Carlos Pereira',
    cnpjCpf: '310.215.889-70',
    endereco: 'Rua Paraná, 412',
    bairro: 'Centro',
    cidade: 'Terra Roxa',
    uf: 'PR',
    telefone: '(44) 99111-0001',
    descontoCents: 2000,
  },
}

// Com PDF_OUT=<dir existente> os PDFs também são gravados pra conferência visual.
const PDF_OUT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PDF_OUT
async function save(name: string, doc: React.ReactElement) {
  if (PDF_OUT) await renderToFile(doc as Parameters<typeof renderToFile>[0], `${PDF_OUT}/${name}`)
}

function pageCount(buf: Uint8Array): string | undefined {
  return new TextDecoder('latin1').decode(buf).match(/\/Count\s+(\d+)/)?.[1]
}

describe('nota de empenho pdf', { timeout: 30_000 }, () => {
  it('pessoa jurídica renders a valid single-page PDF', async () => {
    const doc = <NotaEmpenhoDocument tx={pj} />
    const buf = await renderToBuffer(doc)
    await save('nota-empenho-pj.pdf', doc)
    expect(new TextDecoder().decode(buf.subarray(0, 4))).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('pessoa física renders a single page', async () => {
    const doc = <NotaEmpenhoDocument tx={pf} />
    const buf = await renderToBuffer(doc)
    await save('nota-empenho-pf.pdf', doc)
    expect(pageCount(buf)).toBe('1')
  })

  it('renders with no empenho data at all', async () => {
    const buf = await renderToBuffer(<NotaEmpenhoDocument tx={{ amountCents: 100, date: '2026-09-17', description: '', empenho: null }} />)
    expect(pageCount(buf)).toBe('1')
  })

  it('keeps long values on a single page', async () => {
    const doc = <NotaEmpenhoDocument tx={{
      amountCents: 987654321,
      date: '2026-09-17',
      description: 'AQUISIÇÃO DE MATERIAL DE EXPEDIENTE, LIMPEZA E COPA PARA A SEDE E PARA AS SALAS DE CURSO, CONFORME ORÇAMENTOS APROVADOS PELA DIRETORIA EM REUNIÃO ORDINÁRIA DO MÊS DE SETEMBRO, INCLUINDO FRETE E INSTALAÇÃO',
      empenho: {
        ...pj.empenho,
        nomeFantasia: 'COOPERATIVA AGROINDUSTRIAL DE PRODUTORES RURAIS DO OESTE',
        razaoSocial: 'COOPERATIVA AGROINDUSTRIAL DE PRODUTORES RURAIS DO OESTE DO PARANA LTDA',
        endereco: 'AVENIDA PRESIDENTE TANCREDO DE ALMEIDA NEVES, 12345 - SALA 4',
        bairro: 'JARDIM DAS AMERICAS', banco: 'BANCO DO BRASIL',
      },
    }} />
    const buf = await renderToBuffer(doc)
    await save('nota-empenho-longa.pdf', doc)
    expect(pageCount(buf)).toBe('1')
  })
})
