import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuditLogs, useAdminAdmins } from '@/hooks/useAdmin'
import { usePermissions } from '@/hooks/usePermissions'
import { ScrollText, Plus, Pencil, Trash2, Dot, Search, X, Download, Loader2 } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { NativeSelect } from '@/components/ui/native-select'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { NoPermission } from '@/components/NoPermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type AuditSearch = {
  page?: number
  action?: 'create' | 'edit' | 'delete' | 'export'
  entity?: string
  actorId?: string
  from?: string
  to?: string
  q?: string
}
const ACTIONS: AuditSearch['action'][] = ['create', 'edit', 'delete', 'export']
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

export const Route = createFileRoute('/_admin/admin/auditoria/')({
  validateSearch: (s: Record<string, unknown>): AuditSearch => {
    const page = Number(s.page)
    return {
      page: Number.isFinite(page) && page > 1 ? page : undefined,
      action: ACTIONS.includes(s.action as AuditSearch['action']) ? (s.action as AuditSearch['action']) : undefined,
      entity: str(s.entity),
      actorId: str(s.actorId),
      from: str(s.from),
      to: str(s.to),
      q: str(s.q),
    }
  },
  component: RouteComponent,
})

// Transforma método+entidade em frase legível pra qualquer pessoa.
const VERB: Record<string, string> = { POST: 'Criou', PATCH: 'Editou', PUT: 'Editou', DELETE: 'Excluiu', EXPORT: 'Exportou' }
const ENTITY: Record<string, { n: string; g: 'm' | 'f' }> = {
  'Curso': { n: 'curso', g: 'm' },
  'Cotação': { n: 'cotação', g: 'f' },
  'Sala': { n: 'sala', g: 'f' },
  'Usuário': { n: 'usuário', g: 'm' },
  'Inscrição': { n: 'inscrição', g: 'f' },
  'Notícia': { n: 'notícia', g: 'f' },
  'Banner': { n: 'banner', g: 'm' },
  'Regra': { n: 'regra', g: 'f' },
  'Instrutor': { n: 'instrutor', g: 'm' },
  'Mensagem': { n: 'mensagem', g: 'f' },
  'Propriedade': { n: 'propriedade', g: 'f' },
  'Relação': { n: 'relação', g: 'f' },
  'Endereço': { n: 'endereço', g: 'm' },
  'Categoria financeira': { n: 'categoria financeira', g: 'f' },
  'Caixa': { n: 'caixa', g: 'm' },
  'Lançamento': { n: 'lançamento', g: 'm' },
  'Transferência': { n: 'transferência', g: 'f' },
  'Comprovante': { n: 'comprovante', g: 'm' },
  'Empresa': { n: 'empresa', g: 'f' },
  'Convênio': { n: 'convênio', g: 'm' },
  'Exportação': { n: 'planilha', g: 'f' },
  'Outro': { n: 'registro', g: 'm' },
}
function acaoLegivel(method: string, entity: string, label: string | null): string {
  const v = VERB[method] ?? method
  const e = ENTITY[entity] ?? { n: entity.toLowerCase(), g: 'm' as const }
  if (label) return `${v} ${e.g === 'f' ? 'a' : 'o'} ${e.n} "${label}"`
  return `${v} ${e.g === 'f' ? 'uma' : 'um'} ${e.n}`
}
type ActionKind = 'create' | 'edit' | 'delete' | 'export' | 'other'
function actionKind(method: string): ActionKind {
  if (method === 'POST') return 'create'
  if (method === 'PATCH' || method === 'PUT') return 'edit'
  if (method === 'DELETE') return 'delete'
  if (method === 'EXPORT') return 'export'
  return 'other'
}
const KIND_ICON = { create: Plus, edit: Pencil, delete: Trash2, export: Download, other: Dot }
const KIND_COLOR: Record<ActionKind, string> = {
  create: 'text-emerald-600 dark:text-emerald-400',
  edit: 'text-amber-600 dark:text-amber-400',
  delete: 'text-red-600 dark:text-red-400',
  export: 'text-blue-600 dark:text-blue-400',
  other: 'text-muted-foreground',
}

// Tempo relativo curto ("há 5 min", "há 2 h", "há 3 d"); título traz a data exata.
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const enabled = !permLoading && can('READ_AUDIT')
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (patch: Partial<AuditSearch>) =>
    navigate({ search: prev => ({ ...prev, ...patch }), replace: true })
  const page = search.page ?? 1

  const filters = { action: search.action, entity: search.entity, actorId: search.actorId, from: search.from, to: search.to, q: search.q }
  const { data, isLoading, isError } = useAuditLogs(
    // o hook só repassa `action` para a query; 'export' ainda não está no tipo dele
    { page, limit: 30, ...filters },
    { enabled },
  )
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const count = await downloadExport('audit-logs', filters)
      toast.success(count === 1 ? 'Planilha com 1 registro baixada.' : count >= 0 ? `Planilha com ${count} registros baixada.` : 'Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar a auditoria.'))
    } finally {
      setExporting(false)
    }
  }
  const { data: adminsData } = useAdminAdmins({ page: 1, limit: 200 })
  const admins = adminsData?.data ?? []

  // Busca com debounce → grava `q` na URL.
  const [searchInput, setSearchInput] = useState(search.q ?? '')
  useEffect(() => { setSearchInput(search.q ?? '') }, [search.q])
  const debouncedSearch = useDebouncedValue(searchInput, 350)
  useEffect(() => {
    const q = debouncedSearch.trim() || undefined
    if (q !== (search.q ?? undefined)) setSearch({ q, page: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, search.q])

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const hasFilters = !!(search.action || search.entity || search.actorId || search.from || search.to || search.q)

  function clearFilters() {
    setSearchInput('')
    navigate({ search: {}, replace: true })
  }

  if (!permLoading && !can('READ_AUDIT')) {
    return <NoPermission message="Você não tem permissão para ver a auditoria." />
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro de criações, edições, exclusões e exportações feitas no sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Ação</Label>
            <div className="flex gap-1">
              {([['', 'Todas'], ['create', 'Criações'], ['edit', 'Edições'], ['delete', 'Exclusões'], ['export', 'Exportações']] as const).map(([a, lbl]) => (
                <Button
                  key={a || 'all'}
                  size="sm"
                  variant={(search.action ?? '') === a ? 'default' : 'outline'}
                  className="h-9"
                  onClick={() => setSearch({ action: (a || undefined) as AuditSearch['action'], page: undefined })}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <NativeSelect className="h-9" value={search.entity ?? ''} onChange={e => setSearch({ entity: e.target.value || undefined, page: undefined })}>
              <option value="">Todos</option>
              {Object.keys(ENTITY).filter(k => k !== 'Outro').map(k => <option key={k} value={k}>{k}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Quem</Label>
            <NativeSelect className="h-9" value={search.actorId ?? ''} onChange={e => setSearch({ actorId: e.target.value || undefined, page: undefined })}>
              <option value="">Todos</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">De</Label>
            <Input type="date" className="h-9 w-[150px]" value={search.from ?? ''} onChange={e => setSearch({ from: e.target.value || undefined, page: undefined })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Até</Label>
            <Input type="date" className="h-9 w-[150px]" value={search.to ?? ''} onChange={e => setSearch({ to: e.target.value || undefined, page: undefined })} />
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={clearFilters}>
              <X className="size-4" /> Limpar
            </Button>
          )}
          <Button
            variant="outline"
            className="ml-auto h-9 gap-2"
            disabled={exporting || total === 0}
            onClick={handleExport}
            title={hasFilters ? 'Exportar os registros com os filtros atuais (CSV)' : 'Exportar todos os registros (CSV)'}
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Exportar{total > 0 ? ` (${total})` : ''}
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome do item ou rota..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar a auditoria." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>O que aconteceu</TableHead>
                <TableHead className="hidden lg:table-cell">Detalhe técnico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <ScrollText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      {hasFilters ? 'Nenhum registro com esses filtros' : 'Nenhum registro ainda'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasFilters ? 'Ajuste ou limpe os filtros.' : 'As ações administrativas aparecem aqui conforme acontecem.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => {
                const kind = actionKind(r.method)
                const Icon = KIND_ICON[kind]
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs" title={new Date(r.createdAt).toLocaleString('pt-BR')}>
                      {relativeTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.actorName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={`size-4 shrink-0 ${KIND_COLOR[kind]}`} />
                        <span className="text-foreground">{acaoLegivel(r.method, r.entity, r.targetLabel)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-[11px] text-muted-foreground max-w-xs truncate" title={`${r.method} ${r.path} · ${r.statusCode}`}>
                      {r.method} {r.path} · {r.statusCode}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={30}
          onPageChange={p => setSearch({ page: p <= 1 ? undefined : p })}
          showLimitSelector={false}
        />
      )}
    </div>
  )
}
