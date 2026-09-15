import { Font } from '@react-pdf/renderer'
import { maskCEP, maskCPF, maskPhone } from '@/utils/masks'
import type { UserAddress, UserDataDetail } from '@/hooks/useAdmin'

// Helpers compartilhados pela Ficha e pelo Termo de Adesão da Unimed:
// endereço (urbano OU rural), máscaras e concordância de gênero.

// Sem hifenização: evita "exam-ple.com" e quebras estranhas em nomes/e-mails.
Font.registerHyphenationCallback(word => [word])

export type PdfAddress = Omit<UserAddress, 'id'>

/** Endereço vive na primeira propriedade rural; cai pro endereço legado. */
export function resolveAddress(user: UserDataDetail): PdfAddress | null {
  return user.properties?.[0]?.address ?? user.address ?? null
}

/** Junta partes não-vazias com o separador (ignora nulos/vazios). */
export function joinParts(parts: (string | null | undefined)[], sep = ', '): string {
  return parts.map(p => (p ?? '').toString().trim()).filter(Boolean).join(sep)
}

export function fmtCPF(v: string | null | undefined): string {
  return v ? maskCPF(v) : ''
}

export function fmtCEP(v: string | null | undefined): string {
  return v ? maskCEP(v) : ''
}

export function fmtPhone(v: string | null | undefined): string {
  return v ? maskPhone(v) : ''
}

/** Celular = 11 dígitos começando com 9 após o DDD; o resto é fixo. */
function isMobile(v: string): boolean {
  const d = v.replace(/\D/g, '')
  return d.length === 11 && d[2] === '9'
}

/** Separa os telefones da pessoa em fixo/celular (primeiro de cada tipo). */
export function splitPhones(user: Pick<UserDataDetail, 'phone' | 'phone2' | 'phone3'>): { fixo: string; celular: string } {
  const all = [user.phone, user.phone2, user.phone3].filter((p): p is string => !!p && !!p.trim())
  const celular = all.find(isMobile)
  const fixo = all.find(p => !isMobile(p))
  return { fixo: fmtPhone(fixo), celular: fmtPhone(celular) }
}

/** Campos de endereço da Ficha; endereço rural vira estrada/km, lote/seção, linha. */
export function addressFields(addr: PdfAddress | null) {
  if (!addr) return { cep: '', logradouro: '', complemento: '', bairro: '', cidade: '', uf: '' }
  const rural = addr.type === 'RURAL'
  return {
    cep: fmtCEP(addr.zipCode),
    logradouro: rural
      ? joinParts([addr.road, addr.km ? `KM ${addr.km}` : null])
      : joinParts([addr.street, addr.number]),
    complemento: rural
      ? joinParts([addr.lot ? `LOTE ${addr.lot}` : null, addr.section ? `SEÇÃO ${addr.section}` : null, addr.complement])
      : addr.complement ?? '',
    bairro: rural ? addr.localityName ?? '' : addr.neighborhood ?? '',
    cidade: addr.city ?? '',
    uf: addr.state ?? '',
  }
}

/**
 * Endereço em linha pra cláusula 2 do Termo, como no modelo: "RUA X, nº 10"
 * (a cidade/comarca já vem fixa na cláusula). Rural: linha, estrada, km, lote, seção.
 */
export function addressInline(addr: PdfAddress | null): string {
  if (!addr) return ''
  if (addr.type === 'RURAL') {
    return joinParts([
      addr.localityName,
      addr.road,
      addr.km ? `KM ${addr.km}` : null,
      addr.lot ? `LOTE ${addr.lot}` : null,
      addr.section ? `SEÇÃO ${addr.section}` : null,
    ])
  }
  return joinParts([addr.street, addr.number ? `nº ${addr.number}` : null])
}

type Gender = UserDataDetail['gender']

/** Concordância de gênero: feminino só quando informado; o resto fica no masculino. */
export function byGender(gender: Gender, masc: string, fem: string): string {
  return gender === 'FEMALE' ? fem : masc
}

const MARITAL_WORDS: Record<string, [string, string]> = {
  SINGLE: ['solteiro', 'solteira'],
  MARRIED: ['casado', 'casada'],
  DIVORCED: ['divorciado', 'divorciada'],
  WIDOWED: ['viúvo', 'viúva'],
  DOMESTIC_PARTNERSHIP: ['em união estável', 'em união estável'],
}

/** Estado civil concordado com o gênero; vazio se não informado. */
export function maritalWord(status: string | null | undefined, gender: Gender): string {
  if (!status) return ''
  const pair = MARITAL_WORDS[status]
  if (!pair) return status.toLowerCase()
  return byGender(gender, pair[0], pair[1])
}
