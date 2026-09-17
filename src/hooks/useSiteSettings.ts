import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, API_BASE } from '@/lib/api'
import { ORG_CONTACT } from '@/lib/org-contact'

/** Configurações do site público (Configurações do site no painel). */
export type SiteSettings = {
  facebook: string
  instagram: string
  whatsapp: string
  orgPhone: string
  orgEmail: string
  orgStreet: string
  orgDistrict: string
  orgCity: string
  orgState: string
  orgZip: string
  /** Uma linha por faixa de horário, ex.: "Segunda a Sexta: 08h às 17h". */
  orgHours: string
  /** Texto buscado no Google Maps para o mapa da página Contato. */
  orgMapQuery: string
  aboutText: string
  quotesSource: string
}

export type SiteSettingsInput = Partial<Omit<SiteSettings, 'quotesSource'>>

/** Público: rodapé, Contato, Sobre, faixa de cotações. Fetch direto (sem auth). */
export function usePublicSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ['site-settings', 'public'],
    queryFn: () => fetch(`${API_BASE}/site-settings`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ['site-settings', 'admin'],
    queryFn: () => apiFetch('/admin/site-settings').then(r => r.json()),
  })
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SiteSettingsInput) =>
      apiFetch('/admin/site-settings', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings'] }),
  })
}

/** Fonte da faixa de cotações — endpoint das cotações (permissão das cotações). */
export function useUpdateQuotesSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (source: string) =>
      apiFetch('/admin/market-quotes/source', { method: 'PUT', body: JSON.stringify({ source }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings'] }),
  })
}

export type OrgInfo = {
  phone: string
  email: string
  street: string
  district: string
  city: string
  state: string
  zip: string
  hours: { label: string; time: string }[]
  mapQuery: string
}

// "Segunda a Sexta: 08h às 17h" → { label, time }; linha sem ":" vira só o texto.
function parseHours(text: string): OrgInfo['hours'] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf(':')
      return i > 0 ? { label: line.slice(0, i).trim(), time: line.slice(i + 1).trim() } : { label: line, time: '' }
    })
}

/**
 * Dados do sindicato para o site. Enquanto as configurações carregam (ou se um
 * campo estiver vazio) usa os valores padrão de `org-contact.ts`.
 */
export function useOrgInfo(): OrgInfo {
  const { data } = usePublicSiteSettings()
  const pick = (value: string | undefined, fallback: string) => (value && value.trim() ? value.trim() : fallback)
  return {
    phone: pick(data?.orgPhone, ORG_CONTACT.phone),
    email: pick(data?.orgEmail, ORG_CONTACT.email),
    street: pick(data?.orgStreet, ORG_CONTACT.street),
    district: pick(data?.orgDistrict, ORG_CONTACT.district),
    city: pick(data?.orgCity, ORG_CONTACT.city),
    state: pick(data?.orgState, ORG_CONTACT.state),
    zip: pick(data?.orgZip, ORG_CONTACT.zip),
    hours: parseHours(pick(data?.orgHours, ORG_CONTACT.hours)),
    mapQuery: pick(data?.orgMapQuery, ORG_CONTACT.mapQuery),
  }
}
