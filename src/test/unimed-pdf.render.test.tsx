// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer, renderToFile } from '@react-pdf/renderer'
import { FichaUnimedDocument } from '@/lib/unimed-ficha-pdf'
import { TermoUnimedDocument } from '@/lib/unimed-termo-pdf'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'

// Titular com endereço urbano.
const titular = {
  id: 'u1',
  name: 'JOAO CARLOS PEREIRA',
  email: 'joao.pereira@example.com',
  phone: '44991110001',
  phone2: '4436410000',
  phone3: null,
  cpf: '31021588970',
  rg: '8.123.456-7',
  rgIssuer: 'SSP/PR',
  rgIssuedAt: '1993-05-20T00:00:00.000Z',
  birthDate: '1975-03-12T00:00:00.000Z',
  birthPlace: 'TERRA ROXA - PR',
  nationality: 'BRASILEIRA',
  gender: 'MALE',
  maritalStatus: 'MARRIED',
  educationLevel: 'COMPLETE_SECONDARY',
  address: null,
  userInstructor: null,
  properties: [{
    id: 'p1', name: 'Principal', registration: null,
    address: {
      type: 'URBAN', city: 'TERRA ROXA', state: 'PR', zipCode: '85990000',
      street: 'RUA PARANA', number: '412', neighborhood: 'CENTRO', complement: 'CASA',
      notes: null, localityName: null, road: null, km: null, lot: null, section: null,
    },
  }],
} as unknown as UserDataDetail

// Dependente com endereço rural.
const dependente = {
  ...titular,
  id: 'u2',
  name: 'FERNANDA DA SILVA',
  email: 'fernanda.silva.unimed@example.com',
  phone: '44991110005',
  phone2: null,
  cpf: '75061922336',
  rg: '12.111.222-5',
  rgIssuedAt: '2019-03-22T00:00:00.000Z',
  birthDate: '2004-06-18T00:00:00.000Z',
  gender: 'FEMALE',
  maritalStatus: 'SINGLE',
  educationLevel: 'INCOMPLETE_HIGHER',
  properties: [{
    id: 'p2', name: 'Principal', registration: null,
    address: {
      type: 'RURAL', city: 'TERRA ROXA', state: 'PR', zipCode: null,
      street: null, number: null, neighborhood: null, complement: null, notes: null,
      localityName: 'LINHA SAO JOSE', road: 'ESTRADA TERRA ROXA - GUAIRA', km: '12', lot: '45', section: 'B',
    },
  }],
} as unknown as UserDataDetail

const base: UnimedDetail = {
  id: 'b1', userDataId: 'u1', userData: { id: 'u1', name: titular.name, cpf: titular.cpf },
  dataAdesao: '2024-02-01T00:00:00.000Z', tipoMovimento: 'INCLUSAO DE TITULAR', tipoDependente: 'TITULAR',
  grauDependencia: null, cns: '700501234567890', nomeMae: 'MARIA APARECIDA PEREIRA', profissao: 'PRODUTOR RURAL',
  plano: 'PL AMB+HOS+OBS em ENF c/ Co-part - (467.659/12-9)', matricula: '0123456-01',
  empresa: 'SINDICATO RURAL DE TERRA ROXA', contratante: 'SINDICATO RURAL DE TERRA ROXA',
  titularId: null, motivo: 'Inclusão de novo usuário', obs: null,
  createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z',
}
const dep: UnimedDetail = {
  ...base, id: 'b2', userDataId: 'u2', userData: { id: 'u2', name: dependente.name, cpf: dependente.cpf },
  tipoDependente: 'DEPENDENTE', grauDependencia: 'FILHO(A)', matricula: '0123456-02', titularId: 'u1',
  profissao: 'ESTUDANTE', nomeMae: 'CLEUSA APARECIDA DA SILVA', obs: 'UNIVERSITARIA - COMPROVANTE DE MATRICULA ENTREGUE',
}

// Com PDF_OUT=<dir existente> os PDFs também são gravados pra conferência visual.
const PDF_OUT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PDF_OUT
async function save(name: string, doc: React.ReactElement) {
  if (PDF_OUT) await renderToFile(doc as Parameters<typeof renderToFile>[0], `${PDF_OUT}/${name}`)
}

function pageCount(buf: Uint8Array): string | undefined {
  return new TextDecoder('latin1').decode(buf).match(/\/Count\s+(\d+)/)?.[1]
}

describe('unimed pdfs', () => {
  it('ficha renders a valid single-page PDF (titular urbano)', async () => {
    const doc = <FichaUnimedDocument data={{ unimed: base, user: titular }} />
    const buf = await renderToBuffer(doc)
    await save('ficha-titular.pdf', doc)
    expect(new TextDecoder().decode(buf.subarray(0, 4))).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('ficha renders for dependente rural with titular name', async () => {
    const doc = <FichaUnimedDocument data={{ unimed: dep, user: dependente, titularName: titular.name }} />
    const buf = await renderToBuffer(doc)
    await save('ficha-dependente.pdf', doc)
    expect(new TextDecoder().decode(buf.subarray(0, 4))).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('termo renders two pages', async () => {
    const doc = <TermoUnimedDocument data={{ unimed: base, user: titular }} />
    const buf = await renderToBuffer(doc)
    await save('termo-titular.pdf', doc)
    expect(new TextDecoder().decode(buf.subarray(0, 4))).toBe('%PDF')
    expect(pageCount(buf)).toBe('2')

    const doc2 = <TermoUnimedDocument data={{ unimed: dep, user: dependente }} />
    const buf2 = await renderToBuffer(doc2)
    await save('termo-dependente.pdf', doc2)
    expect(pageCount(buf2)).toBe('2')
  })
})
