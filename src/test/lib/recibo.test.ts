import { describe, it, expect } from 'vitest'
import {
  RECIBO_TEXTOS, alvoDoLancamento, dataPorExtenso, documentoDoPagador, emissorDoRecibo, enderecoDoPagador, montarRecibo,
  nomeDoArquivoRecibo, numeroDoRecibo, pagadorDoRecibo, podeGerarRecibo, textoPlano, trechosDoRecibo,
  type ReciboData,
} from '@/lib/recibo'
import { ORG_CONTACT } from '@/lib/org-contact'
import type { FinanceTransaction } from '@/hooks/useFinance'

/** O "R$ 1.234,56" do Intl usa espaço sem quebra; nos textos comparamos com espaço comum. */
const plano = (t: ReciboData) => textoPlano(trechosDoRecibo(t)).replace(/\u00a0/g, ' ')

const base: ReciboData = {
  type: 'IN',
  amountCents: 123456,
  date: '2026-10-30T00:00:00.000Z',
  description: 'MENSALIDADE DE OUTUBRO',
  empenho: {
    razaoSocial: 'COOPERATIVA AGRICOLA LTDA',
    cnpjCpf: '11222333000181',
    endereco: 'RUA DAS FLORES, 100',
    bairro: 'CENTRO',
    cidade: 'TERRA ROXA',
    uf: 'PR',
    cep: '85990-000',
  },
}

describe('podeGerarRecibo', () => {
  it('entrada comum tem recibo', () => {
    expect(podeGerarRecibo({ type: 'IN', transferId: null })).toBe(true)
    expect(podeGerarRecibo({ type: 'IN' })).toBe(true)
  })

  it('saída não tem', () => {
    expect(podeGerarRecibo({ type: 'OUT', transferId: null })).toBe(false)
  })

  it('"só nota" (type nulo) não tem', () => {
    expect(podeGerarRecibo({ type: null, transferId: null })).toBe(false)
  })

  it('a perna de entrada de uma transferência entre caixas não tem', () => {
    expect(podeGerarRecibo({ type: 'IN', transferId: 'tr-1' })).toBe(false)
  })
})

describe('documentoDoPagador', () => {
  it('CPF com 11 dígitos sai formatado e com o rótulo CPF', () => {
    expect(documentoDoPagador('31021588970')).toEqual({ rotulo: 'CPF', valor: '310.215.889-70' })
    expect(documentoDoPagador('310.215.889-70')).toEqual({ rotulo: 'CPF', valor: '310.215.889-70' })
  })

  it('CNPJ com 14 dígitos sai formatado e com o rótulo CNPJ', () => {
    expect(documentoDoPagador('11222333000181')).toEqual({ rotulo: 'CNPJ', valor: '11.222.333/0001-81' })
    expect(documentoDoPagador(' 11.222.333/0001-81 ')).toEqual({ rotulo: 'CNPJ', valor: '11.222.333/0001-81' })
  })

  it('tamanho estranho vai como foi digitado, com o rótulo CNPJ/CPF', () => {
    expect(documentoDoPagador('123.456')).toEqual({ rotulo: 'CNPJ/CPF', valor: '123.456' })
  })

  it('vazio, só espaços ou sem dígito não é documento', () => {
    expect(documentoDoPagador(undefined)).toBeNull()
    expect(documentoDoPagador(null)).toBeNull()
    expect(documentoDoPagador('   ')).toBeNull()
    expect(documentoDoPagador('ISENTO')).toBeNull()
  })
})

describe('enderecoDoPagador', () => {
  it('junta endereço, bairro, cidade/UF e CEP', () => {
    expect(enderecoDoPagador(base.empenho)).toBe('RUA DAS FLORES, 100, CENTRO, TERRA ROXA/PR, CEP 85990-000')
  })

  it('pula o que estiver vazio, sem vírgula solta', () => {
    expect(enderecoDoPagador({ endereco: 'RUA A, 1', bairro: '  ', cidade: 'TERRA ROXA' })).toBe('RUA A, 1, TERRA ROXA')
    expect(enderecoDoPagador({ uf: 'PR' })).toBe('PR')
  })

  it('sem nada devolve null', () => {
    expect(enderecoDoPagador(null)).toBeNull()
    expect(enderecoDoPagador(undefined)).toBeNull()
    expect(enderecoDoPagador({ razaoSocial: 'X', endereco: ' ' })).toBeNull()
  })
})

describe('dataPorExtenso', () => {
  it('escreve dia, mês e ano', () => {
    expect(dataPorExtenso('2026-10-30')).toBe('30 de outubro de 2026')
    expect(dataPorExtenso('2026-03-05')).toBe('5 de março de 2026')
  })

  it('o dia 1 vai como "1º"', () => {
    expect(dataPorExtenso('2026-09-01')).toBe('1º de setembro de 2026')
  })

  it('aceita o ISO da API e vale o dia escrito, sem fuso', () => {
    expect(dataPorExtenso('2026-10-30T00:00:00.000Z')).toBe('30 de outubro de 2026')
    expect(dataPorExtenso('2026-12-31T23:59:59.000Z')).toBe('31 de dezembro de 2026')
  })

  it('data inválida vira texto vazio', () => {
    expect(dataPorExtenso('')).toBe('')
    expect(dataPorExtenso('lixo')).toBe('')
    expect(dataPorExtenso('2026-13-01')).toBe('')
  })
})

describe('numeroDoRecibo', () => {
  it('usa o número do lançamento quando existe', () => {
    expect(numeroDoRecibo({ number: 123 })).toBe('123')
  })

  it('sem número (ainda não existe no objeto, nulo ou inválido) o quadro não aparece', () => {
    expect(numeroDoRecibo({})).toBeNull()
    expect(numeroDoRecibo({ number: null })).toBeNull()
    expect(numeroDoRecibo({ number: 0 })).toBeNull()
    expect(numeroDoRecibo({ number: 1.5 })).toBeNull()
  })
})

describe('pagadorDoRecibo', () => {
  it('o nome é a razão social e, sem ela, o nome fantasia (o mesmo da coluna "Nome / Razão social")', () => {
    expect(pagadorDoRecibo({ empenho: { razaoSocial: 'RAZAO LTDA', nomeFantasia: 'FANTASIA' } }).nome).toBe('RAZAO LTDA')
    expect(pagadorDoRecibo({ empenho: { razaoSocial: '  ', nomeFantasia: ' FANTASIA ' } }).nome).toBe('FANTASIA')
  })

  it('sem empenho, nada', () => {
    expect(pagadorDoRecibo({ empenho: null })).toEqual({ nome: null, documento: null, endereco: null })
  })
})

describe('texto do recibo', () => {
  it('com nome, CNPJ, endereço, valor, extenso e descrição', () => {
    expect(plano(base)).toBe(
      'Recebemos de COOPERATIVA AGRICOLA LTDA, CNPJ 11.222.333/0001-81, '
      + 'RUA DAS FLORES, 100, CENTRO, TERRA ROXA/PR, CEP 85990-000, '
      + 'a importância de R$ 1.234,56 '
      + '(UM MIL DUZENTOS E TRINTA E QUATRO REAIS E CINQUENTA E SEIS CENTAVOS), '
      + 'referente a MENSALIDADE DE OUTUBRO.',
    )
  })

  it('pessoa física: CPF formatado', () => {
    const t: ReciboData = { ...base, amountCents: 15000, empenho: { razaoSocial: 'JOAO CARLOS PEREIRA', cnpjCpf: '31021588970' } }
    expect(plano(t)).toBe(
      'Recebemos de JOAO CARLOS PEREIRA, CPF 310.215.889-70, a importância de R$ 150,00 '
      + '(CENTO E CINQUENTA REAIS), referente a MENSALIDADE DE OUTUBRO.',
    )
  })

  it('sem documento: só o nome (e o endereço, se houver)', () => {
    const t: ReciboData = { ...base, empenho: { razaoSocial: 'MERCADO CENTRAL', endereco: 'RUA B, 2' } }
    expect(plano(t)).toContain('Recebemos de MERCADO CENTRAL, RUA B, 2, a importância de')
  })

  it('sem nome: só o documento', () => {
    const t: ReciboData = { ...base, empenho: { cnpjCpf: '11222333000181' } }
    expect(plano(t)).toContain('Recebemos de CNPJ 11.222.333/0001-81, a importância de')
  })

  it('sem nome e sem documento: "Recebemos a importância de…", sem buraco e sem endereço solto', () => {
    const t: ReciboData = { ...base, empenho: { endereco: 'RUA SEM DONO, 9' } }
    const texto = plano(t)
    expect(texto.startsWith('Recebemos a importância de R$ 1.234,56 (')).toBe(true)
    expect(texto).not.toContain('RUA SEM DONO')
    expect(texto).not.toMatch(/,\s*,|\s{2,}|de\s*,/)
    expect(plano({ ...base, empenho: null }).startsWith('Recebemos a importância de')).toBe(true)
  })

  it('o fantasia entra quando a razão social está vazia', () => {
    const t: ReciboData = { ...base, empenho: { razaoSocial: '', nomeFantasia: 'FAZENDA BOA VISTA' } }
    expect(plano(t)).toContain('Recebemos de FAZENDA BOA VISTA, a importância de')
  })

  it('nome, documento, valor e descrição vão em negrito; o resto, não', () => {
    const negritos = trechosDoRecibo(base).filter(t => t.negrito).map(t => t.texto.replace(/\u00a0/g, ' ').replace(/[,.]$/, ''))
    expect(negritos).toEqual(['COOPERATIVA AGRICOLA LTDA', '11.222.333/0001-81', 'R$ 1.234,56', 'MENSALIDADE DE OUTUBRO'])
  })

  it('nenhum trecho começa com pontuação: ela vai grudada no trecho anterior (senão o PDF quebra a linha ali e põe um hífen)', () => {
    for (const t of [base, { ...base, empenho: null }, { ...base, description: '' }, { ...base, empenho: { cnpjCpf: '31021588970' } }]) {
      for (const trecho of trechosDoRecibo(t)) expect(trecho.texto).not.toMatch(/^[,.;:)]/)
    }
  })

  it('o valor por extenso acompanha o valor (formato do legado, em maiúsculas)', () => {
    expect(plano({ ...base, amountCents: 100 })).toContain('R$ 1,00 (UM REAL)')
    expect(plano({ ...base, amountCents: 50 })).toContain('R$ 0,50 (CINQUENTA CENTAVOS)')
    expect(plano({ ...base, amountCents: 100000 })).toContain('R$ 1.000,00 (UM MIL REAIS)')
    expect(plano({ ...base, amountCents: 100000000 })).toContain('R$ 1.000.000,00 (UM MILHÃO DE REAIS)')
  })

  it('sem descrição, a frase termina no valor; ponto final da descrição não dobra', () => {
    expect(plano({ ...base, description: '  ' }).endsWith('CENTAVOS).')).toBe(true)
    expect(plano({ ...base, description: 'ALUGUEL DO SALAO.' }).endsWith('referente a ALUGUEL DO SALAO.')).toBe(true)
  })
})

describe('montarRecibo', () => {
  const emissor = { cidade: 'Terra Roxa' }

  it('forma de pagamento: aparece quando o lançamento tem uma', () => {
    expect(montarRecibo({ ...base, method: 'PIX' }, emissor).formaDePagamento).toBe('Forma de pagamento: PIX')
    expect(montarRecibo({ ...base, method: '  TRANSFERENCIA  ' }, emissor).formaDePagamento).toBe('Forma de pagamento: TRANSFERENCIA')
  })

  it('sem forma de pagamento, a linha não existe', () => {
    expect(montarRecibo({ ...base, method: null }, emissor).formaDePagamento).toBeNull()
    expect(montarRecibo({ ...base, method: '   ' }, emissor).formaDePagamento).toBeNull()
    expect(montarRecibo(base, emissor).formaDePagamento).toBeNull()
  })

  it('local e data: "<Cidade>, <data por extenso>"', () => {
    expect(montarRecibo(base, emissor).localEData).toBe('Terra Roxa, 30 de outubro de 2026')
  })

  it('sem cidade nas configurações, só a data', () => {
    expect(montarRecibo(base, { cidade: '' }).localEData).toBe('30 de outubro de 2026')
  })

  it('valor em destaque e número', () => {
    const r = montarRecibo({ ...base, number: 77 }, emissor)
    expect(r.valor.replace(/\u00a0/g, ' ')).toBe('R$ 1.234,56')
    expect(r.numero).toBe('77')
    expect(montarRecibo(base, emissor).numero).toBeNull()
  })

  it('o título do botão e o do aviso de erro estão nos textos do recibo', () => {
    expect(RECIBO_TEXTOS.botao).toBe('Gerar recibo em PDF')
    expect(RECIBO_TEXTOS.erro).toBe('Erro ao gerar o recibo.')
  })
})

describe('emissorDoRecibo', () => {
  it('cabeçalho com o CNPJ do sindicato e o endereço das Configurações em duas linhas', () => {
    const e = emissorDoRecibo({
      street: 'Rua José Tondato, 80', district: 'Centro', city: 'Terra Roxa', state: 'PR', zip: '85990-000', phone: '(44) 3645-2199',
    })
    expect(e.nome).toBe('SINDICATO RURAL DE TERRA ROXA / PR')
    expect(e.cnpj).toBe(ORG_CONTACT.cnpj)
    expect(e.linhasEndereco).toEqual(['Rua José Tondato, 80, Centro', 'Terra Roxa – PR, 85990-000'])
    expect(e.telefone).toBe('(44) 3645-2199')
    expect(e.cidade).toBe('Terra Roxa')
  })

  it('campo vazio nas Configurações some do endereço', () => {
    const e = emissorDoRecibo({ street: '', district: '', city: 'Terra Roxa', state: '', zip: '', phone: '' })
    expect(e.linhasEndereco).toEqual(['Terra Roxa'])
    expect(e.telefone).toBe('')
  })
})

describe('recibo de um lançamento que veio da API (SR-066: `number`)', () => {
  // O mesmo objeto que a lista do Financeiro entrega ao ReciboButton: o `number` do lançamento
  // vale no quadro "Nº" e no nome do arquivo; o "Nº anterior" (`empenho.numero`) não aparece no recibo.
  const daApi = {
    id: 'l1', number: 130, type: 'IN', transferId: null, amountCents: 123456, date: '2026-10-30T00:00:00.000Z',
    description: 'MENSALIDADE DE OUTUBRO', method: null,
    empenho: { numero: '3144', razaoSocial: 'COOPERATIVA AGRICOLA LTDA', cnpjCpf: '11222333000181' },
  } as FinanceTransaction

  it('o quadro "Nº" é o número do lançamento, não o "Nº anterior"', () => {
    expect(montarRecibo(daApi, { cidade: 'Terra Roxa' }).numero).toBe('130')
  })

  it('o nome do arquivo usa o número do lançamento', () => {
    expect(nomeDoArquivoRecibo(daApi)).toBe('recibo-130-cooperativa-agricola-ltda.pdf')
  })

  it('lançamento sem número (só os excluídos antigos): sem quadro, e o arquivo usa a data', () => {
    const semNumero = { ...daApi, number: null } as FinanceTransaction
    expect(montarRecibo(semNumero, { cidade: 'Terra Roxa' }).numero).toBeNull()
    expect(nomeDoArquivoRecibo(semNumero)).toBe('recibo-2026-10-30-cooperativa-agricola-ltda.pdf')
  })
})

describe('nomeDoArquivoRecibo', () => {
  it('com número: recibo-<número>-<nome curto>.pdf', () => {
    expect(nomeDoArquivoRecibo({ ...base, number: 123 })).toBe('recibo-123-cooperativa-agricola-ltda.pdf')
  })

  it('sem número: usa a data', () => {
    expect(nomeDoArquivoRecibo(base)).toBe('recibo-2026-10-30-cooperativa-agricola-ltda.pdf')
  })

  it('nome comprido é cortado e não deixa hífen no fim', () => {
    const nome = nomeDoArquivoRecibo({ ...base, empenho: { razaoSocial: 'COMPANHIA DE SANEAMENTO DO PARANA - SANEPAR S/A' } })
    expect(nome).toBe('recibo-2026-10-30-companhia-de-saneamento-do-par.pdf')
  })

  it('se o corte cair num hífen, ele não fica no fim do nome', () => {
    const nome = nomeDoArquivoRecibo({ ...base, empenho: { razaoSocial: `${'A'.repeat(29)} B` } })
    expect(nome).toBe(`recibo-2026-10-30-${'a'.repeat(29)}.pdf`)
  })

  it('sem nome de quem pagou, o nome curto vem da descrição; sem nenhum dos dois, fica só o número ou a data', () => {
    expect(nomeDoArquivoRecibo({ ...base, empenho: null })).toBe('recibo-2026-10-30-mensalidade-de-outubro.pdf')
    expect(nomeDoArquivoRecibo({ ...base, empenho: null, description: '', number: 5 })).toBe('recibo-5.pdf')
  })
})

describe('alvoDoLancamento (auditoria do Recibo e da Nota de Empenho, SR-106)', () => {
  it('"Nº 128 · <nome>"; sem Nº, só o nome; sem nome, a descrição', () => {
    expect(alvoDoLancamento({ ...base, number: 128 })).toBe('Nº 128 · COOPERATIVA AGRICOLA LTDA')
    expect(alvoDoLancamento(base)).toBe('COOPERATIVA AGRICOLA LTDA')
    expect(alvoDoLancamento({ ...base, number: 5, empenho: null })).toBe('Nº 5 · MENSALIDADE DE OUTUBRO')
    expect(alvoDoLancamento({ ...base, empenho: { nomeFantasia: 'COOP' } })).toBe('COOP')
  })
})
