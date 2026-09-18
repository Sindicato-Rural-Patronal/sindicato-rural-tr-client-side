import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidateUserViews } from '@/hooks/useAdmin'

// Cadastros repetidos da mesma pessoa. A inscrição pública em curso só reconhece
// a pessoa pelo CPF, então quem estava no cadastro antigo sem CPF ganha um
// segundo cadastro ao se inscrever — estas telas acham e juntam os dois.

export type DuplicateReason = 'NOME' | 'TELEFONE' | 'EMAIL'

export const DUPLICATE_REASON_LABEL: Record<DuplicateReason, string> = {
  NOME: 'Mesmo nome',
  TELEFONE: 'Mesmo telefone',
  EMAIL: 'Mesmo e-mail',
}

export type MergeCandidate = {
  id: string
  name: string
  cpf: string | null
  email: string | null
  phone: string
  createdAt: string
  /** Tem conta de acesso ao painel (só um dos dois pode ter). */
  hasLogin: boolean
  counts: {
    registrations: number
    companies: number
    properties: number
    relations: number
  }
}

export type DuplicateGroup = {
  key: string
  reason: DuplicateReason
  people: MergeCandidate[]
}

export type MergeResult = {
  keepId: string
  removedId: string
  movedRegistrations: number
  movedCompanies: number
  movedProperties: number
  movedRelations: number
  /** Campos que estavam vazios no cadastro que ficou e foram preenchidos. */
  filledFields: string[]
}

export function useDuplicatePeople(options: { enabled?: boolean } = {}) {
  return useQuery<{ groups: DuplicateGroup[] }>({
    queryKey: ['admin', 'users', 'duplicates'],
    queryFn: () => apiFetch('/admin/users/duplicates?limit=50').then(r => r.json()),
    enabled: options.enabled ?? true,
  })
}

/** Os dois cadastros lado a lado (com os números de cada um) antes de juntar. */
export function useMergePreview(ids: [string, string] | null) {
  const key = ids ? ids.join(',') : ''
  return useQuery<{ people: MergeCandidate[] }>({
    queryKey: ['admin', 'users', 'merge-preview', key],
    queryFn: () => apiFetch(`/admin/users/merge-preview?ids=${key}`).then(r => r.json()),
    enabled: !!ids,
  })
}

export function useMergePeople() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { keepId: string; removeId: string }) =>
      apiFetch('/admin/users/merge', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<MergeResult>),
    onSuccess: () => {
      // A pessoa some de uma lista e aparece na outra: invalida tudo onde ela entra.
      invalidateUserViews(queryClient)
    },
  })
}

/** Frase do toast: "3 inscrições, 1 empresa e 2 campos preenchidos". */
export function mergeSummary(result: MergeResult): string {
  const parts: string[] = []
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`)
  }
  add(result.movedRegistrations, 'inscrição', 'inscrições')
  add(result.movedCompanies, 'empresa', 'empresas')
  add(result.movedProperties, 'propriedade', 'propriedades')
  add(result.movedRelations, 'relação', 'relações')
  add(result.filledFields.length, 'campo preenchido', 'campos preenchidos')
  if (parts.length === 0) return 'Cadastros juntados.'
  const last = parts.pop() as string
  return `Cadastros juntados: ${parts.length > 0 ? `${parts.join(', ')} e ${last}` : last}.`
}
