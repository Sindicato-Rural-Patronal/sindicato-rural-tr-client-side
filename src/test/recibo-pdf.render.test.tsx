// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer, renderToFile } from '@react-pdf/renderer'
import { ReciboDocument } from '@/lib/recibo-pdf'
import { emissorDoRecibo, type ReciboData } from '@/lib/recibo'

const emissor = emissorDoRecibo({
  street: 'Rua José Tondato, 80', district: 'Centro', city: 'Terra Roxa', state: 'PR', zip: '85990-000', phone: '(44) 3645-2199',
})

// Dados inventados: empresa que paga a anuidade, com todos os campos.
const empresa: ReciboData = {
  type: 'IN',
  amountCents: 123456,
  date: '2026-10-30T00:00:00.000Z',
  description: 'ANUIDADE 2026 - CONTRIBUICAO SINDICAL RURAL',
  method: 'PIX',
  number: 128,
  empenho: {
    razaoSocial: 'COOPERATIVA AGROINDUSTRIAL BOA SAFRA LTDA',
    cnpjCpf: '11222333000181',
    endereco: 'AVENIDA BRASIL, 1500',
    bairro: 'CENTRO',
    cidade: 'TERRA ROXA',
    uf: 'PR',
    cep: '85990-000',
  },
}

// Pessoa física, sem número e sem forma de pagamento.
const pessoa: ReciboData = {
  type: 'IN',
  amountCents: 15000,
  date: '2026-09-01T00:00:00.000Z',
  description: 'Mensalidade de associado',
  empenho: { razaoSocial: 'JOAO CARLOS PEREIRA', cnpjCpf: '31021588970' },
}

// Com PDF_OUT=<dir existente> os PDFs também são gravados pra conferência visual.
const PDF_OUT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PDF_OUT
async function save(name: string, doc: React.ReactElement) {
  if (PDF_OUT) await renderToFile(doc as Parameters<typeof renderToFile>[0], `${PDF_OUT}/${name}`)
}

function pageCount(buf: Uint8Array): string | undefined {
  return new TextDecoder('latin1').decode(buf).match(/\/Count\s+(\d+)/)?.[1]
}

describe('recibo pdf', { timeout: 30_000 }, () => {
  it('empresa, com número e forma de pagamento: PDF válido de uma página', async () => {
    const doc = <ReciboDocument tx={empresa} emissor={emissor} />
    const buf = await renderToBuffer(doc)
    await save('recibo-empresa.pdf', doc)
    expect(new TextDecoder().decode(buf.subarray(0, 4))).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('pessoa física, sem número e sem forma de pagamento', async () => {
    const doc = <ReciboDocument tx={pessoa} emissor={emissor} />
    const buf = await renderToBuffer(doc)
    await save('recibo-pessoa.pdf', doc)
    expect(pageCount(buf)).toBe('1')
  })

  it('sem nenhum dado de quem pagou e sem cidade nas configurações', async () => {
    const buf = await renderToBuffer(
      <ReciboDocument tx={{ type: 'IN', amountCents: 100, date: '2026-09-17', description: '', empenho: null }} emissor={{ ...emissor, cidade: '', cnpj: '', telefone: '', linhasEndereco: [] }} />,
    )
    expect(pageCount(buf)).toBe('1')
  })

  it('valor e descrição muito longos continuam numa página', async () => {
    const doc = <ReciboDocument tx={{
      ...empresa,
      amountCents: 987654321,
      description: 'AQUISICAO DE MATERIAL DE EXPEDIENTE, LIMPEZA E COPA PARA A SEDE E PARA AS SALAS DE CURSO, CONFORME ORCAMENTOS APROVADOS PELA DIRETORIA EM REUNIAO ORDINARIA DO MES DE SETEMBRO, INCLUINDO FRETE E INSTALACAO',
      empenho: { ...empresa.empenho, razaoSocial: 'COOPERATIVA AGROINDUSTRIAL DE PRODUTORES RURAIS DO OESTE DO PARANA LTDA' },
    }} emissor={emissor} />
    const buf = await renderToBuffer(doc)
    await save('recibo-longo.pdf', doc)
    expect(pageCount(buf)).toBe('1')
  })
})
