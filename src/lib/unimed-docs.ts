import { apiFetch } from '@/lib/api'
import { downloadFichaUnimed } from '@/lib/unimed-ficha-pdf'
import { downloadTermoUnimed } from '@/lib/unimed-termo-pdf'
import { downloadContratoUnimed } from '@/lib/unimed-contrato-pdf'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'

// Os três documentos da Unimed (Ficha, Termo e Contrato) são cópia do modelo do
// sistema antigo e precisam da ficha completa da pessoa — por isso cada botão
// busca o beneficiário e o UserData antes de gerar o PDF. Compartilhado pela
// tela /admin/unimed e pela aba Unimed da ficha da pessoa.

async function fetchUnimed(unimedId: string) {
  const unimed = await apiFetch(`/admin/unimed/${unimedId}`).then(r => r.json()) as UnimedDetail
  const user = await apiFetch(`/admin/users/${unimed.userDataId}`).then(r => r.json()) as UserDataDetail
  return { unimed, user }
}

/** Formulário de Movimentação de Beneficiários. */
export async function baixarFichaUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  let titularName: string | undefined
  if (unimed.titularId) {
    const titular = await apiFetch(`/admin/users/${unimed.titularId}`).then(r => r.json())
    titularName = titular?.name ?? undefined
  }
  await downloadFichaUnimed({ unimed, user, titularName })
}

/** Termo de Adesão ao Contrato de Plano de Saúde. */
export async function baixarTermoUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  await downloadTermoUnimed({ unimed, user })
}

/** Termo de Ciência e Consentimento (o "Contrato" do sistema antigo). */
export async function baixarContratoUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  await downloadContratoUnimed({ unimed, user })
}
