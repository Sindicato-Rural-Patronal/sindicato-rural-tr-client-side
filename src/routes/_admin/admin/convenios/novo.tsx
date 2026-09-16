import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'
import { ConvenioEditor } from '@/components/convenio/ConvenioEditor'

export const Route = createFileRoute('/_admin/admin/convenios/novo')({
  beforeLoad: () => requirePermission('CREATE_CONVENIO'),
  component: () => <ConvenioEditor />,
})
