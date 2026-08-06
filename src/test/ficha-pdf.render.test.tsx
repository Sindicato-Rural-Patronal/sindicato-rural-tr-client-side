// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { FichaInscricaoDocument } from '@/lib/ficha-inscricao-pdf'
import type { UserDataDetail } from '@/hooks/useAdmin'

const sampleUser = {
  id: 'u1',
  name: 'JANETE CARLOS',
  email: 'janetecarlos@icloud.com',
  phone: '(44)99956-1872',
  phone2: '(44)3641-0000',
  cpf: '046.690.819-93',
  cnpj: null,
  avatar: null,
  nickname: null,
  birthDate: '1985-10-04',
  birthPlace: 'Terra Roxa',
  nationality: 'Brasileira',
  gender: 'FEMALE',
  ethnicity: 'MIXED',
  educationLevel: 'POSTGRADUATE',
  functionalCategory: 'Produtor Rural',
  cadPro: '',
  familyIncome: '303600', // R$ 3.036,00 (~2 salários) → de 1 a 3
  specialNeeds: false,
  memberNotesNumber: '146',
  properties: [{
    id: 'p1',
    name: 'Principal',
    registration: null,
    address: {
      type: 'URBAN',
      city: 'TERRA ROXA',
      state: 'PR',
      zipCode: '85990000',
      street: 'AV DA SAUDADE',
      number: '0',
      neighborhood: 'ECOVILLE 3',
      complement: null,
      notes: null,
      localityName: null,
      road: null,
      km: null,
      lot: null,
      section: null,
    },
  }],
  userInstructor: null,
} as unknown as UserDataDetail

describe('ficha inscrição pdf', () => {
  it('renders a valid PDF', async () => {
    const buf = await renderToBuffer(
      <FichaInscricaoDocument
        fichas={[{ course: { eventNumber: '267468', title: 'PANIFICAÇÃO RURAL' }, user: sampleUser }]}
      />,
    )
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders one page per participant', async () => {
    const two = [
      { course: { eventNumber: '1', title: 'A' }, user: sampleUser },
      { course: { eventNumber: '1', title: 'A' }, user: sampleUser },
    ]
    const buf = await renderToBuffer(<FichaInscricaoDocument fichas={two} />)
    const pdf = buf.toString('latin1')
    const count = pdf.match(/\/Count\s+(\d+)/)?.[1]
    expect(count).toBe('2')
  })
})
