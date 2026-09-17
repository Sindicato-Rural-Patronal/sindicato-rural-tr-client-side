import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useCreateCompany } from '@/hooks/useCompanies'
import { CompanyForm } from '@/components/cadastro/CompanyForm'

export const Route = createFileRoute('/_admin/admin/empresas/novo')({
  beforeLoad: () => requirePermission('CREATE_USER'),
  component: NovaEmpresaPage,
})

function NovaEmpresaPage() {
  const navigate = useNavigate()
  const createM = useCreateCompany()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link to="/admin/usuarios" search={{ tab: 'empresas' }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Empresas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Nova empresa</h1>
        <p className="text-sm text-muted-foreground">
          Depois de criar, vincule as pessoas e adicione outros endereços.
        </p>
      </div>

      <CompanyForm
        saving={createM.isPending}
        submitLabel="Criar empresa"
        onSubmit={async (input, allowLeave) => {
          try {
            const created = await createM.mutateAsync(input)
            toast.success('Empresa criada.')
            // Já salvou: sai sem o aviso de alterações não salvas.
            allowLeave()
            navigate({ to: '/admin/empresas/$id', params: { id: created.id }, replace: true })
            return true
          } catch (e) {
            toast.error(apiErrorMessage(e, 'Erro ao criar empresa.'))
            return false
          }
        }}
      />
    </div>
  )
}
