import { describe, it, expect } from 'vitest'
import { MEMBER_TYPE_OPTIONS, memberTypeLabel } from '@/lib/member-types'
import { roomNameOptions } from '@/lib/room-names'
import { currentQuotePeriod, quoteProductLabel, trendOf } from '@/lib/quote-utils'
import { companyDisplayName } from '@/hooks/useCompanies'

describe('tipo de membro', () => {
  it('tem as quatro opções fixas', () => {
    expect(MEMBER_TYPE_OPTIONS.map(o => o.value)).toEqual([
      'ALUNO', 'PRODUTOR RURAL', 'TRABALHADOR RURAL ASSALARIADO', 'TRABALHADOR RURAL AUTONOMO',
    ])
  })

  it('mostra o rótulo com acento', () => {
    expect(memberTypeLabel('TRABALHADOR RURAL AUTONOMO')).toBe('Trabalhador rural autônomo')
    expect(memberTypeLabel(null)).toBe('')
  })
})

describe('salas', () => {
  it('desabilita salas já cadastradas, menos a que está sendo editada', () => {
    const opts = roomNameOptions(['AUDITORIO', 'SALA 1'], 'SALA 1')
    expect(opts.find(o => o.value === 'AUDITORIO')).toMatchObject({ disabled: true, label: 'AUDITORIO (já cadastrada)' })
    expect(opts.find(o => o.value === 'SALA 1')).toMatchObject({ disabled: false })
    expect(opts.find(o => o.value === 'COZINHA')).toMatchObject({ disabled: false })
  })

  it('inclui nome antigo fora da lista ao editar', () => {
    const opts = roomNameOptions(['LAB 01'], 'LAB 01')
    expect(opts.at(-1)).toEqual({ value: 'LAB 01', label: 'LAB 01 (nome antigo)', disabled: false })
  })
})

describe('cotações', () => {
  it('período sugerido pela hora', () => {
    expect(currentQuotePeriod(new Date(2026, 8, 16, 11, 59))).toBe('MORNING')
    expect(currentQuotePeriod(new Date(2026, 8, 16, 12, 0))).toBe('AFTERNOON')
  })

  it('rótulo dos produtos e tendência da variação', () => {
    expect(quoteProductLabel('DOLAR')).toBe('Dólar')
    expect(trendOf('+1,2%')).toBe('up')
    expect(trendOf('-0,4%')).toBe('down')
    expect(trendOf('0,0%')).toBe('neutral')
    expect(trendOf(null)).toBe('neutral')
  })
})

describe('empresa', () => {
  it('exibe o nome fantasia quando houver', () => {
    expect(companyDisplayName({ name: 'AGRO LTDA', tradeName: 'AGRO' })).toBe('AGRO')
    expect(companyDisplayName({ name: 'AGRO LTDA', tradeName: null })).toBe('AGRO LTDA')
  })
})
