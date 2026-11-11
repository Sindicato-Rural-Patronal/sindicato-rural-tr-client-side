import { apiFetch } from '@/lib/api'
import { registrarDocumento, type DocumentoDoNavegador } from '@/lib/registrar-documento'
import { downloadFichaUnimed } from '@/lib/unimed-ficha-pdf'
import { downloadTermoUnimed } from '@/lib/unimed-termo-pdf'
import { downloadContratoUnimed } from '@/lib/unimed-contrato-pdf'
import type { UnimedDetail } from '@/hooks/useUnimed'
import type { UserDataDetail } from '@/hooks/useAdmin'

// Os três documentos da Unimed (Ficha, Termo e Contrato) são cópia do modelo do
// sistema antigo e precisam da ficha completa da pessoa — por isso cada botão
// busca o beneficiário e o UserData antes de gerar o PDF. Compartilhado pela
// tela /admin/unimed e pela aba Unimed da ficha da pessoa.
//
// Antes de gerar, cada documento vai para a auditoria (SR-106), com o nome da
// pessoa: "Gerou o documento "Ficha da Unimed: MARIA · 1 registro · com CPF, …"".
// Se o registro falhar, o PDF não sai e o erro (`DocumentoNaoRegistradoError`,
// mensagem pronta) chega a quem chamou, que mostra pelo `apiErrorMessage`.

async function fetchUnimed(unimedId: string) {
  const unimed = await apiFetch(`/admin/unimed/${unimedId}`).then(r => r.json()) as UnimedDetail
  const user = await apiFetch(`/admin/users/${unimed.userDataId}`).then(r => r.json()) as UserDataDetail
  return { unimed, user }
}

/** A linha da auditoria, com tudo já buscado: logo depois vem o PDF. */
function registrar(documento: DocumentoDoNavegador, unimedId: string, user: Pick<UserDataDetail, 'name'>) {
  return registrarDocumento(documento, { linhas: 1, alvo: user.name, ids: [unimedId] })
}

/** Formulário de Movimentação de Beneficiários. */
export async function baixarFichaUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  let titularName: string | undefined
  if (unimed.titularId) {
    const titular = await apiFetch(`/admin/users/${unimed.titularId}`).then(r => r.json())
    titularName = titular?.name ?? undefined
  }
  await registrar('unimed-ficha', unimedId, user)
  await downloadFichaUnimed({ unimed, user, titularName })
}

/** Termo de Adesão ao Contrato de Plano de Saúde. */
export async function baixarTermoUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  await registrar('unimed-termo-adesao', unimedId, user)
  await downloadTermoUnimed({ unimed, user })
}

/** Termo de Ciência e Consentimento (o "Contrato" do sistema antigo). */
export async function baixarContratoUnimed(unimedId: string) {
  const { unimed, user } = await fetchUnimed(unimedId)
  await registrar('unimed-contrato', unimedId, user)
  await downloadContratoUnimed({ unimed, user })
}
