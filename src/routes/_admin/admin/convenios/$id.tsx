import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'
import { ConvenioEditor } from '@/components/convenio/ConvenioEditor'

export const Route = createFileRoute('/_admin/admin/convenios/$id')({
  beforeLoad: () => requirePermission('READ_CONVENIO'),
  component: EditConvenioPage,
})

function EditConvenioPage() {
  const { id } = Route.useParams()
  // `key` remonta o editor ao trocar de convênio (ex.: logo após criar).
  return <ConvenioEditor key={id} id={id} />
}
