import { describe, it, expect } from 'vitest'
import { maskWhatsappInput, whatsappFieldFromStored, whatsappStoredFromField } from '@/lib/whatsapp-field'

describe('maskWhatsappInput', () => {
  it('número ganha a máscara; +55 sai', () => {
    expect(maskWhatsappInput('44999990000')).toBe('(44) 99999-0000')
    expect(maskWhatsappInput('4436452199')).toBe('(44) 3645-2199')
    expect(maskWhatsappInput('+55 44 99999-0000')).toBe('(44) 99999-0000')
  })

  it('link ou vazio ficam como vieram', () => {
    expect(maskWhatsappInput('https://wa.me/5544999990000')).toBe('https://wa.me/5544999990000')
    expect(maskWhatsappInput('wa.me/55')).toBe('wa.me/55')
    expect(maskWhatsappInput('')).toBe('')
  })
})

describe('whatsappFieldFromStored', () => {
  it('link só com o número aparece como telefone', () => {
    expect(whatsappFieldFromStored('https://wa.me/5544999990000')).toBe('(44) 99999-0000')
    expect(whatsappFieldFromStored('https://api.whatsapp.com/send?phone=5544999990000')).toBe('(44) 99999-0000')
    expect(whatsappFieldFromStored('https://api.whatsapp.com/send/?phone=554436452199&text&type=phone_number')).toBe('(44) 3645-2199')
    expect(whatsappFieldFromStored('wa.me/5544999990000')).toBe('(44) 99999-0000')
  })

  it('cadastro antigo só com o número também', () => {
    expect(whatsappFieldFromStored('(44) 99999-0000')).toBe('(44) 99999-0000')
  })

  it('link com mensagem, de outro país ou de outro site fica como link', () => {
    expect(whatsappFieldFromStored('https://wa.me/5544999990000?text=Ol%C3%A1')).toBe('https://wa.me/5544999990000?text=Ol%C3%A1')
    expect(whatsappFieldFromStored('https://wa.me/14155550123')).toBe('https://wa.me/14155550123')
    expect(whatsappFieldFromStored('https://wa.me/message/ABCDEF')).toBe('https://wa.me/message/ABCDEF')
    expect(whatsappFieldFromStored('')).toBe('')
    expect(whatsappFieldFromStored(null)).toBe('')
  })
})

describe('whatsappStoredFromField', () => {
  it('número → https://wa.me/55<DDD+número>', () => {
    expect(whatsappStoredFromField('(44) 99999-0000')).toEqual({ value: 'https://wa.me/5544999990000' })
    expect(whatsappStoredFromField('(44) 3645-2199')).toEqual({ value: 'https://wa.me/554436452199' })
  })

  it('vazio tira do site', () => {
    expect(whatsappStoredFromField('  ')).toEqual({ value: '' })
  })

  it('número incompleto é erro', () => {
    expect(whatsappStoredFromField('(44) 9999')).toHaveProperty('error')
  })

  it('link colado: só o número vira wa.me; os outros ficam como estão', () => {
    expect(whatsappStoredFromField('https://api.whatsapp.com/send?phone=5544999990000')).toEqual({ value: 'https://wa.me/5544999990000' })
    expect(whatsappStoredFromField('https://wa.me/5544999990000?text=Oi')).toEqual({ value: 'https://wa.me/5544999990000?text=Oi' })
    expect(whatsappStoredFromField('wa.me/message/ABCDEF')).toEqual({ value: 'https://wa.me/message/ABCDEF' })
  })

  it('texto que não é número nem link é erro', () => {
    expect(whatsappStoredFromField('ligar para a Maria')).toHaveProperty('error')
  })
})
