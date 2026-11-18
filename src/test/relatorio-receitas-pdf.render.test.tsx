// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { RelatorioReceitasDocument } from '@/lib/relatorio-receitas-pdf'
import { blocosDeReceitas } from '@/lib/relatorio-receitas'
import type { FinanceTransaction } from '@/hooks/useFinance'

// "RECEITAS / RELATÓRIO" (SR-140): os textos do papel aparecem.

type Pdf = Awaited<ReturnType<typeof renderToBuffer>>

const latin1 = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join('')

async function textoDoPdf(buf: Pdf): Promise<string> {
  const bruto = buf.toString('latin1')
  const trechos: string[] = []
  for (const m of bruto.matchAll(/\/Length (\d+)[^]*?>>\s*stream\r?\n/g)) {
    const inicio = m.index + m[0].length
    const comprimido = new Uint8Array(buf.subarray(inicio, inicio + Number(m[1])))
    let conteudo: string
    try {
      const fluxo = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate'))
      conteudo = latin1(new Uint8Array(await new Response(fluxo).arrayBuffer()))
    } catch {
      continue
    }
    for (const tj of conteudo.matchAll(/\[(.*?)\] TJ/g)) {
      const hex = [...tj[1].matchAll(/<([0-9a-f]*)>/g)].map(h => h[1]).join('')
      trechos.push((hex.match(/../g) ?? []).map(h => String.fromCharCode(parseInt(h, 16))).join(''))
    }
  }
  return trechos.join('|')
}

const entidade = {
  nome: 'SINDICATO RURAL DE TERRA ROXA / PR',
  cnpj: '77.419.505/0001-10',
  endereco: 'RUA TESTE, 100',
  cepCidade: 'CEP: 87000-000 / TERRA ROXA / PR',
  telefone: '(44) 3000-0000',
  site: 'www.ruraltr.com.br',
}

function lanc(over: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: Math.random().toString(36).slice(2), number: null, type: 'IN', amountCents: 10000,
    date: '2026-11-05', description: 'RECEITA', method: null, notes: null, categoryId: null, category: null,
    accountId: null, account: null, transferId: null, recurringId: null, recurringMonth: null, empenho: null,
    attachments: [], createdBy: null, createdAt: '', updatedAt: '', ...over,
  } as FinanceTransaction
}

const render = (txns: FinanceTransaction[]) =>
  renderToBuffer(
    <RelatorioReceitasDocument
      entidade={entidade} blocos={blocosDeReceitas(txns)} de="2026-11-01" ate="2026-11-30"
    />,
  )

describe('RelatorioReceitasDocument', () => {
  it('mostra título, período, colunas, linhas, subtotais e total geral', async () => {
    const texto = await textoDoPdf(await render([
      lanc({
        number: 128, description: 'ALUGUEL DO AUDITORIO', method: 'PIX', amountCents: 150000,
        categoryId: 'a',
        category: { id: 'a', name: 'ALUGUEL', type: 'IN', color: '#000', active: true, order: 0 } as FinanceTransaction['category'],
        empenho: { razaoSocial: 'COOP LTDA', cnpjCpf: '77419505000110' },
      }),
      lanc({ description: 'DOACAO', amountCents: 2550 }),
    ]))
    expect(texto).toContain('RECEITAS / RELAT')
    expect(texto).toContain('01/11/2026 A 30/11/2026')
    for (const rotulo of ['Nome / Raz', 'CNPJ / CPF', 'Descri', 'Forma de pagamento', 'Valor (R$)']) {
      expect(texto).toContain(rotulo)
    }
    expect(texto).toContain('COOP LTDA')
    expect(texto).toContain('77.419.505/0001-10')
    expect(texto).toContain('ALUGUEL DO AUDITORIO')
    expect(texto).toContain('PIX')
    expect(texto).toContain('Sem categoria')
    // O react-pdf parte o texto em trechos: "Subtotal |ALUGUEL|: |R$ 1.500,00".
    expect(texto).toMatch(/Subtotal \|?ALUGUEL/)
    expect(texto).toContain('1.500,00')
    expect(texto).toContain('TOTAL GERAL')
    expect(texto).toContain('1.525,50')
    expect(texto.search(/Subtotal \|?ALUGUEL/)).toBeLessThan(texto.search(/Subtotal \|?Sem categoria/))
    expect(texto).not.toContain('Nenhuma receita no per')
  })

  it('sem entrada no período diz que não há receita', async () => {
    const texto = await textoDoPdf(await render([lanc({ type: 'OUT' })]))
    expect(texto).toContain('RECEITAS / RELAT')
    expect(texto).toContain('Nenhuma receita no per')
    expect(texto).not.toContain('TOTAL GERAL')
  })
})
