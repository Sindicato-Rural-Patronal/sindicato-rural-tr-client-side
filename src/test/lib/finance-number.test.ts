import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api'
import {
  NUMERO_MAXIMO, ehNumeroEmUso, escolherNumero, lerNumeroDigitado, nomeDoArquivoNotaEmpenho, numeroValido,
  rotuloDoNumero, saltoDaSequencia, soDigitosDoNumero, textoAutomatico, textoDaTransferencia, textoDoRegistro,
  textoDoSalto, textoNumeroAnterior, prefixoDaExclusao,
} from '@/lib/finance-number'

describe('numeroValido', () => {
  it('só inteiro positivo', () => {
    expect(numeroValido(1)).toBe(true)
    expect(numeroValido(5000)).toBe(true)
    expect(numeroValido(0)).toBe(false)
    expect(numeroValido(-3)).toBe(false)
    expect(numeroValido(1.5)).toBe(false)
    expect(numeroValido(null)).toBe(false)
    expect(numeroValido(undefined)).toBe(false)
    expect(numeroValido('12')).toBe(false)
  })
})

describe('soDigitosDoNumero', () => {
  it('tira o que não é dígito (colar "Nº 12" ou "1.234" deixa só os números)', () => {
    expect(soDigitosDoNumero('Nº 12')).toBe('12')
    expect(soDigitosDoNumero('1.234')).toBe('1234')
    expect(soDigitosDoNumero('abc')).toBe('')
  })

  it('não passa de 10 dígitos (o tamanho do maior número aceito)', () => {
    expect(soDigitosDoNumero('123456789012')).toBe('1234567890')
  })
})

describe('textoAutomatico', () => {
  it('com o próximo carregado: "Automático (próximo: 128)"', () => {
    expect(textoAutomatico(128)).toBe('Automático (próximo: 128)')
    expect(textoAutomatico(1)).toBe('Automático (próximo: 1)')
  })

  it('sem o próximo (carregando, falhou ou valor estranho): só "Automático"', () => {
    expect(textoAutomatico(undefined)).toBe('Automático')
    expect(textoAutomatico(null)).toBe('Automático')
    expect(textoAutomatico(0)).toBe('Automático')
  })
})

describe('lerNumeroDigitado', () => {
  it('vazio ou só espaços é automático', () => {
    expect(lerNumeroDigitado('')).toEqual({ tipo: 'vazio' })
    expect(lerNumeroDigitado('   ')).toEqual({ tipo: 'vazio' })
  })

  it('número comum; zeros à esquerda não contam ("0045" é 45)', () => {
    expect(lerNumeroDigitado('128')).toEqual({ tipo: 'numero', valor: 128 })
    expect(lerNumeroDigitado(' 5000 ')).toEqual({ tipo: 'numero', valor: 5000 })
    expect(lerNumeroDigitado('0045')).toEqual({ tipo: 'numero', valor: 45 })
  })

  it('zero é recusado (a API só aceita de 1 em diante)', () => {
    expect(lerNumeroDigitado('0')).toEqual({ tipo: 'invalido', erro: 'O Nº precisa ser maior que zero.' })
    expect(lerNumeroDigitado('000')).toEqual({ tipo: 'invalido', erro: 'O Nº precisa ser maior que zero.' })
  })

  it('texto, sinal e vírgula são recusados', () => {
    for (const t of ['12a', '-5', '1,5', '1.5', 'abc']) {
      expect(lerNumeroDigitado(t), t).toEqual({ tipo: 'invalido', erro: 'Use só números no Nº.' })
    }
  })

  it('acima do limite do int4 é recusado, no limite passa', () => {
    expect(lerNumeroDigitado(String(NUMERO_MAXIMO))).toEqual({ tipo: 'numero', valor: NUMERO_MAXIMO })
    const r = lerNumeroDigitado(String(NUMERO_MAXIMO + 1))
    expect(r.tipo).toBe('invalido')
  })
})

describe('escolherNumero: o que o corpo leva', () => {
  it('lançamento novo: vazio é automático, e o POST não manda `number`', () => {
    expect(escolherNumero('', { editando: false })).toEqual({ ok: true, enviar: undefined })
  })

  it('lançamento novo: o número digitado vai no corpo', () => {
    expect(escolherNumero('130', { editando: false })).toEqual({ ok: true, enviar: 130 })
  })

  it('edição: o número igual ao atual não vai no PATCH (nada mudou)', () => {
    expect(escolherNumero('12', { editando: true, original: 12 })).toEqual({ ok: true, enviar: undefined })
    expect(escolherNumero('012', { editando: true, original: 12 })).toEqual({ ok: true, enviar: undefined })
  })

  it('edição: o número corrigido vai no PATCH', () => {
    expect(escolherNumero('15', { editando: true, original: 12 })).toEqual({ ok: true, enviar: 15 })
  })

  it('edição: esvaziar o campo é erro da tela, porque a API não deixa apagar o número (400)', () => {
    const r = escolherNumero('', { editando: true, original: 12 })
    expect(r).toEqual({ ok: false, erro: 'Não dá para apagar o Nº do lançamento. Digite um número (o atual é 12).' })
  })

  it('edição de lançamento sem número (só os excluídos antigos): vazio não muda nada', () => {
    expect(escolherNumero('', { editando: true, original: null })).toEqual({ ok: true, enviar: undefined })
  })

  it('número inválido volta o motivo, na criação e na edição', () => {
    expect(escolherNumero('0', { editando: false })).toEqual({ ok: false, erro: 'O Nº precisa ser maior que zero.' })
    expect(escolherNumero('0', { editando: true, original: 12 })).toEqual({ ok: false, erro: 'O Nº precisa ser maior que zero.' })
  })
})

describe('saltoDaSequencia', () => {
  it('à frente do próximo: pula, e os automáticos continuam do digitado + 1', () => {
    expect(saltoDaSequencia(5000, 128)).toEqual({ de: 128, para: 5000, depois: 5001 })
    expect(saltoDaSequencia(129, 128)).toEqual({ de: 128, para: 129, depois: 130 })
  })

  it('igual ao próximo ou abaixo dele (um buraco que se preenche): a sequência não muda, sem pergunta', () => {
    expect(saltoDaSequencia(128, 128)).toBeNull()
    expect(saltoDaSequencia(5, 128)).toBeNull()
  })

  it('sem o próximo conhecido não há como saber: sem pergunta (quem decide é a API)', () => {
    expect(saltoDaSequencia(5000, undefined)).toBeNull()
    expect(saltoDaSequencia(5000, null)).toBeNull()
  })
})

describe('textoDoSalto', () => {
  it('é a pergunta da decisão 005, com os números sem separador de milhar', () => {
    expect(textoDoSalto({ de: 128, para: 5000, depois: 5001 }))
      .toBe('Esse número pula do 128 para o 5000. Os próximos automáticos continuam do 5001.')
  })
})

describe('textoDoRegistro', () => {
  it('diz o Nº que o lançamento recebeu', () => {
    expect(textoDoRegistro(128)).toBe('Lançamento registrado: Nº 128')
  })

  it('sem o número na resposta (API de antes), fica o texto de sempre', () => {
    expect(textoDoRegistro(undefined)).toBe('Lançamento registrado!')
    expect(textoDoRegistro(null)).toBe('Lançamento registrado!')
  })
})

describe('textoDaTransferencia', () => {
  it('avisa os dois números, saída e entrada', () => {
    expect(textoDaTransferencia([{ number: 130 }, { number: 131 }])).toBe('Transferência registrada: Nº 130 e 131')
  })

  it('sem os números na resposta, fica o texto de sempre', () => {
    expect(textoDaTransferencia(undefined)).toBe('Transferência registrada!')
    expect(textoDaTransferencia([])).toBe('Transferência registrada!')
    expect(textoDaTransferencia([{ number: null }, {}])).toBe('Transferência registrada!')
  })

  it('só um número que veio: não inventa o outro', () => {
    expect(textoDaTransferencia([{ number: 130 }, { number: null }])).toBe('Transferência registrada: Nº 130')
  })
})

describe('rotuloDoNumero', () => {
  it('"Nº 128", sem separador de milhar', () => {
    expect(rotuloDoNumero(128)).toBe('Nº 128')
    expect(rotuloDoNumero(12345)).toBe('Nº 12345')
  })
})

describe('ehNumeroEmUso: o 409 do campo Nº', () => {
  it('reconhece as duas mensagens da API', () => {
    expect(ehNumeroEmUso(new ApiError(409, 'O número 123 já é de outro lançamento.'))).toBe(true)
    expect(ehNumeroEmUso(new ApiError(409, 'O número 123 já é de um lançamento excluído.'))).toBe(true)
  })

  it('outro 409 (mês fechado) não é do campo Nº', () => {
    expect(ehNumeroEmUso(new ApiError(409, 'O mês 10/2026 está fechado no caixa "BANCO". Reabra o mês para mudar lançamentos dele.'))).toBe(false)
  })

  it('a mesma frase com outro status, ou um erro qualquer, também não', () => {
    expect(ehNumeroEmUso(new ApiError(400, 'O número 123 já é de outro lançamento.'))).toBe(false)
    expect(ehNumeroEmUso(new Error('O número 123 já é de outro lançamento.'))).toBe(false)
    expect(ehNumeroEmUso(null)).toBe(false)
  })
})

describe('Nota de Empenho: Nº anterior e nome do arquivo', () => {
  it('"Nº anterior: X" quando o lançamento tem, aparado', () => {
    expect(textoNumeroAnterior('3144')).toBe('Nº anterior: 3144')
    expect(textoNumeroAnterior('  NE-2024/7 ')).toBe('Nº anterior: NE-2024/7')
  })

  it('sem Nº anterior não há texto', () => {
    expect(textoNumeroAnterior(undefined)).toBeNull()
    expect(textoNumeroAnterior(null)).toBeNull()
    expect(textoNumeroAnterior('  ')).toBeNull()
  })

  it('o arquivo leva o Nº do lançamento: nota-empenho-<Nº>.pdf', () => {
    expect(nomeDoArquivoNotaEmpenho(130)).toBe('nota-empenho-130.pdf')
  })

  it('sem Nº, nota-empenho.pdf (o Nº anterior não entra no nome)', () => {
    expect(nomeDoArquivoNotaEmpenho(null)).toBe('nota-empenho.pdf')
    expect(nomeDoArquivoNotaEmpenho(undefined)).toBe('nota-empenho.pdf')
  })
})

describe('prefixoDaExclusao', () => {
  it('com Nº cita o número na confirmação', () => {
    expect(`${prefixoDaExclusao(215)}SR067 API PATCH NULL (R$ 12,34)?`).toBe('Excluir o lançamento Nº 215 — SR067 API PATCH NULL (R$ 12,34)?')
  })
  it('sem Nº (null, undefined ou inválido) mantém o texto de antes', () => {
    expect(prefixoDaExclusao(null)).toBe('Excluir ')
    expect(prefixoDaExclusao(undefined)).toBe('Excluir ')
    expect(prefixoDaExclusao(0)).toBe('Excluir ')
  })
})
