import { describe, it, expect } from 'vitest'
import { orgAddressLines, phoneDigits } from '@/lib/org-contact'

const full = { street: 'Rua José Tondato, 80', district: 'Centro', city: 'Terra Roxa', state: 'PR', zip: '85990-000' }

describe('dados do sindicato: endereço', () => {
  it('monta as duas linhas completas', () => {
    expect(orgAddressLines(full)).toEqual(['Rua José Tondato, 80, Centro', 'Terra Roxa – PR, 85990-000'])
  })

  it('sem bairro ou CEP não sobra separador', () => {
    expect(orgAddressLines({ ...full, district: '', zip: '' })).toEqual(['Rua José Tondato, 80', 'Terra Roxa – PR'])
    expect(orgAddressLines({ ...full, city: '', state: 'PR' })).toEqual(['Rua José Tondato, 80, Centro', 'PR, 85990-000'])
  })

  it('tudo vazio não gera linha', () => {
    expect(orgAddressLines({ street: '', district: '', city: '', state: '', zip: '' })).toEqual([])
  })

  it('telefone só com dígitos para o tel:', () => {
    expect(phoneDigits('(44) 3645-2199')).toBe('4436452199')
  })
})
