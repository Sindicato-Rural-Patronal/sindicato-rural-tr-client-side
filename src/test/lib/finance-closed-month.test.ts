import { describe, it, expect } from 'vitest'
import {
  closedMonthForRow, closedMonthForTransaction, closedMonthForTransfer, closedMonthMessage,
  findClosedMonth, isClosed, transactionMonth,
} from '@/lib/finance-closed-month'
import { monthNumeric } from '@/lib/finance-month'

// Trava do mês fechado na tela (SR-060), espelho da API (SR-054): por caixa e
// mês, o mês da data em UTC, lançamento sem caixa livre, transferência olha a
// origem e o destino.

const BANCO = 'banco'
const COFRE = 'cofre'
// Outubro fechado no BANCO; o COFRE só tem setembro fechado.
const FECHADOS = [
  { accountId: BANCO, month: '2026-10' },
  { accountId: COFRE, month: '2026-09' },
]

describe('mês do lançamento', () => {
  it('"AAAA-MM-DD" do formulário: o próprio mês', () => {
    expect(transactionMonth('2026-10-01')).toBe('2026-10')
    expect(transactionMonth('2026-10-31')).toBe('2026-10')
  })

  it('ISO da API: o mês da data em UTC, como a API conta', () => {
    expect(transactionMonth('2026-10-31T00:00:00.000Z')).toBe('2026-10')
    // 23h de 31/10 em Brasília já é 01/11 em UTC: a API conta novembro.
    expect(transactionMonth('2026-11-01T02:00:00.000Z')).toBe('2026-11')
  })

  it('data inválida não trava nada', () => {
    expect(transactionMonth('')).toBeNull()
    expect(transactionMonth('sem-data')).toBeNull()
    expect(isClosed(BANCO, 'sem-data', FECHADOS)).toBe(false)
  })

  it('"2026-10" vira "10/2026"', () => {
    expect(monthNumeric('2026-10')).toBe('10/2026')
    expect(monthNumeric('2027-01')).toBe('01/2027')
  })
})

describe('isClosed / findClosedMonth', () => {
  it('fecha o par caixa + mês, não o mês inteiro', () => {
    expect(isClosed(BANCO, '2026-10-15', FECHADOS)).toBe(true)
    // O mesmo mês em outro caixa continua livre.
    expect(isClosed(COFRE, '2026-10-15', FECHADOS)).toBe(false)
    // O mês seguinte no mesmo caixa também.
    expect(isClosed(BANCO, '2026-11-01', FECHADOS)).toBe(false)
  })

  it('lançamento sem caixa nunca trava', () => {
    expect(isClosed(null, '2026-10-15', FECHADOS)).toBe(false)
    expect(isClosed(undefined, '2026-10-15', FECHADOS)).toBe(false)
    expect(isClosed('', '2026-10-15', FECHADOS)).toBe(false)
  })

  it('sem a lista de fechamentos (carregando ou com erro), nada trava: quem decide é a API', () => {
    expect(isClosed(BANCO, '2026-10-15', undefined)).toBe(false)
    expect(isClosed(BANCO, '2026-10-15', [])).toBe(false)
  })

  it('devolve o próprio fechamento (com o id, para reabrir)', () => {
    const lista = [{ id: 'f1', accountId: BANCO, month: '2026-10' }]
    expect(findClosedMonth(BANCO, '2026-10-02', lista)?.id).toBe('f1')
  })
})

describe('formulário de lançamento', () => {
  it('novo: trava pelo caixa e pela data escolhidos', () => {
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-10-20' }, FECHADOS)).toEqual(FECHADOS[0])
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-11-20' }, FECHADOS)).toBeNull()
    expect(closedMonthForTransaction({ accountId: null, date: '2026-10-20' }, FECHADOS)).toBeNull()
  })

  it('trocar o caixa ou a data para fora do mês fechado libera', () => {
    expect(closedMonthForTransaction({ accountId: COFRE, date: '2026-10-20' }, FECHADOS)).toBeNull()
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-09-30' }, FECHADOS)).toBeNull()
  })

  it('edição: tirar o lançamento de um mês fechado também é recusado', () => {
    const original = { accountId: BANCO, date: '2026-10-05T00:00:00.000Z' }
    // Mudou a data para novembro (aberto): continua travado pelo lugar de onde sai.
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-11-05' }, FECHADOS, original)).toEqual(FECHADOS[0])
    // Mudou o caixa: idem.
    expect(closedMonthForTransaction({ accountId: null, date: '2026-10-05' }, FECHADOS, original)).toEqual(FECHADOS[0])
  })

  it('edição: entrar num mês fechado é recusado mesmo vindo de um aberto', () => {
    const original = { accountId: COFRE, date: '2026-10-05T00:00:00.000Z' }
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-10-05' }, FECHADOS, original)).toEqual(FECHADOS[0])
  })

  it('com dois meses fechados no caminho, cita o mais antigo (como a mensagem da API)', () => {
    const original = { accountId: BANCO, date: '2026-10-05T00:00:00.000Z' }
    expect(closedMonthForTransaction({ accountId: COFRE, date: '2026-09-05' }, FECHADOS, original)).toEqual(FECHADOS[1])
  })

  it('"Repetir" é um lançamento novo com a data de hoje: vale o mês da data nova, não o do original', () => {
    // O original está em outubro fechado; a cópia em novembro passa.
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-11-03' }, FECHADOS, null)).toBeNull()
    // Se hoje também caísse num mês fechado do caixa, o formulário avisaria.
    expect(closedMonthForTransaction({ accountId: BANCO, date: '2026-10-30' }, FECHADOS, null)).toEqual(FECHADOS[0])
  })
})

describe('transferência', () => {
  it('recusada se o mês está fechado na origem ou no destino', () => {
    expect(closedMonthForTransfer({ fromAccountId: BANCO, toAccountId: COFRE, date: '2026-10-10' }, FECHADOS)).toEqual(FECHADOS[0])
    expect(closedMonthForTransfer({ fromAccountId: COFRE, toAccountId: BANCO, date: '2026-10-10' }, FECHADOS)).toEqual(FECHADOS[0])
    expect(closedMonthForTransfer({ fromAccountId: COFRE, toAccountId: 'outro', date: '2026-09-10' }, FECHADOS)).toEqual(FECHADOS[1])
  })

  it('livre quando os dois caixas estão abertos no mês, ou ainda sem caixa escolhido', () => {
    expect(closedMonthForTransfer({ fromAccountId: BANCO, toAccountId: COFRE, date: '2026-11-10' }, FECHADOS)).toBeNull()
    expect(closedMonthForTransfer({ fromAccountId: '', toAccountId: '', date: '2026-10-10' }, FECHADOS)).toBeNull()
  })
})

describe('linha da lista', () => {
  const tx = (id: string, accountId: string | null, date: string, transferId: string | null = null) =>
    ({ id, accountId, date, transferId })

  it('lançamento no mês fechado do caixa dele: travado', () => {
    const t = tx('t1', BANCO, '2026-10-12T00:00:00.000Z')
    expect(closedMonthForRow(t, [t], FECHADOS)).toEqual(FECHADOS[0])
  })

  it('o mesmo mês em outro caixa, outro mês ou sem caixa: livre', () => {
    for (const t of [tx('a', COFRE, '2026-10-12T00:00:00.000Z'), tx('b', BANCO, '2026-11-12T00:00:00.000Z'), tx('c', null, '2026-10-12T00:00:00.000Z')]) {
      expect(closedMonthForRow(t, [t], FECHADOS)).toBeNull()
    }
  })

  it('perna de transferência: olha também a outra perna (excluir uma apaga as duas)', () => {
    const saida = tx('s', COFRE, '2026-10-12T00:00:00.000Z', 'tr1')
    const entrada = tx('e', BANCO, '2026-10-12T00:00:00.000Z', 'tr1')
    // A saída do COFRE (aberto em outubro) trava porque a entrada caiu no BANCO fechado.
    expect(closedMonthForRow(saida, [saida, entrada], FECHADOS)).toEqual(FECHADOS[0])
    // Outra transferência na página não conta.
    const outra = tx('x', BANCO, '2026-10-12T00:00:00.000Z', 'tr2')
    expect(closedMonthForRow(saida, [saida, outra], FECHADOS)).toBeNull()
  })
})

describe('texto do motivo', () => {
  it('o mesmo na lista, no formulário e na transferência', () => {
    expect(closedMonthMessage('2026-10', 'BANCO'))
      .toBe('Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba Fechamento.')
  })

  it('sem o nome do caixa, não inventa um', () => {
    expect(closedMonthMessage('2026-10', null))
      .toBe('Mês 10/2026 fechado neste caixa. Para mudar, reabra o mês na aba Fechamento.')
  })
})
