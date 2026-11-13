import { createFileRoute } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useAdminAdmins } from '@/hooks/useAdmin'
import { useAuditTrail } from '@/hooks/useAuditTrail'
import type { AuditAction, AuditTrailItem } from '@/hooks/useAuditTrail'
import { usePermissions } from '@/hooks/usePermissions'
import {
  ScrollText, Plus, Pencil, Trash2, Dot, Search, X, Download, LogIn, ShieldAlert, ChevronDown,
} from 'lucide-react'
import { AuditRowDetails } from '@/components/auditoria/AuditRowDetails'
import { AuditRetentionPanel } from '@/components/auditoria/AuditRetentionPanel'
import { ExportMenu } from '@/components/export/ExportMenu'
import { textosDaAuditoria } from '@/components/export/filter-texts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { NativeSelect } from '@/components/ui/native-select'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { NoPermission } from '@/components/NoPermission'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { EmptyState } from '@/components/EmptyState'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type AuditSearch = {
  page?: number
  action?: AuditAction
  entity?: string
  actorId?: string
  ip?: string
  from?: string
  to?: string
  q?: string
}
const ACTION_OPTIONS: [AuditAction, string][] = [
  ['create', 'Criações'],
  ['edit', 'Edições'],
  ['delete', 'Exclusões'],
  ['export', 'Exportações'],
  ['login', 'Logins'],
  ['login_failed', 'Falhas de login'],
]
const ACTIONS = ACTION_OPTIONS.map(([a]) => a)
/** Os nomes do filtro "Ação", para a linha "Filtros:" do montador ("Ação: Exportações"). */
const NOMES_DAS_ACOES: Record<string, string> = Object.fromEntries(ACTION_OPTIONS)
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

export const Route = createFileRoute('/_admin/admin/auditoria/')({
  validateSearch: (s: Record<string, unknown>): AuditSearch => {
    const page = Number(s.page)
    return {
      page: Number.isFinite(page) && page > 1 ? page : undefined,
      action: ACTIONS.includes(s.action as AuditAction) ? (s.action as AuditAction) : undefined,
      entity: str(s.entity),
      actorId: str(s.actorId),
      ip: str(s.ip),
      from: str(s.from),
      to: str(s.to),
      q: str(s.q),
    }
  },
  component: RouteComponent,
})

// Tipos gravados pelo backend (lib/audit-entity.ts), para o filtro "Tipo".
const ENTITIES = [
  'Administrador', 'Auditoria', 'Banner', 'Beneficiário Unimed', 'Caixa', 'Categoria financeira', 'Comprovante',
  'Configurações do site', 'Contato público', 'Convênio', 'Convite', 'Cotação', 'Curso', 'Empresa',
  'Endereço', 'Exportação', 'Fechamento de caixa', 'Galeria', 'Inscrição', 'Instrutor', 'Lançamento', 'Login', 'Mensagem',
  'Modelo de relatório', 'Notícia',
  'Propriedade', 'Regra', 'Relação', 'Reserva de sala', 'Sala', 'Transferência', 'Usuário',
]

// A frase ("Iniciou o curso "HORTA"") vem pronta do backend (lib/audit-sentence.ts).
// Sem ela (backend antigo), mostra o básico.
const VERB: Record<string, string> = {
  POST: 'Criou', PATCH: 'Editou', PUT: 'Editou', DELETE: 'Excluiu', EXPORT: 'Exportou',
  LOGIN: 'Entrou no painel', LOGIN_FAILED: 'Tentativa de login falhou', LOGIN_BLOCKED: 'Login bloqueado',
}
function acaoLegivel(r: AuditTrailItem): string {
  if (r.summary) return r.summary
  const base = `${VERB[r.method] ?? r.method} · ${r.entity}`
  return r.targetLabel ? `${base} "${r.targetLabel}"` : base
}
type ActionKind = 'create' | 'edit' | 'delete' | 'export' | 'login' | 'login_failed' | 'other'
function actionKind(method: string): ActionKind {
  if (method === 'POST') return 'create'
  if (method === 'PATCH' || method === 'PUT') return 'edit'
  if (method === 'DELETE') return 'delete'
  if (method === 'EXPORT') return 'export'
  if (method === 'LOGIN') return 'login'
  if (method === 'LOGIN_FAILED' || method === 'LOGIN_BLOCKED') return 'login_failed'
  return 'other'
}
const KIND_ICON = {
  create: Plus, edit: Pencil, delete: Trash2, export: Download, login: LogIn, login_failed: ShieldAlert, other: Dot,
}
// O ícone já diz o tipo; cor só no que pede atenção (exclusão e falha de login), no
// vermelho da terra roxa. O resto fica no tom apagado do texto.
const KIND_COLOR: Record<ActionKind, string> = {
  create: 'text-faint-foreground',
  edit: 'text-faint-foreground',
  delete: 'text-destructive',
  export: 'text-faint-foreground',
  login: 'text-faint-foreground',
  login_failed: 'text-destructive',
  other: 'text-faint-foreground',
}

/** "Terra Roxa, PR, Brasil · Chrome no Windows" (linhas antigas: vazio). */
function origemLegivel(r: AuditTrailItem): string {
  return [r.location, r.device].filter(Boolean).join(' · ')
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
  const setSearch = useCallback(
    // Trocar filtro não é sair de tela: só virar de página leva de volta ao topo.
    (patch: Partial<AuditSearch>) =>
      navigate({ search: prev => ({ ...prev, ...patch }), replace: true, resetScroll: 'page' in patch }),
    [navigate],
  )
  const page = search.page ?? 1

  const filters = {
    action: search.action, entity: search.entity, actorId: search.actorId, ip: search.ip,
    from: search.from, to: search.to, q: search.q,
  }
  const { data, isLoading, isError, isFetching, refetch } = useAuditTrail({ page, limit: 30, ...filters }, { enabled })
  // Linhas abertas (IP, navegador, o que mudou).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  function toggleRow(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data: adminsData } = useAdminAdmins({ page: 1, limit: 200 })
  const admins = adminsData?.data ?? []

  // Busca com debounce → grava `q` na URL.
  const [searchInput, setSearchInput] = useState(search.q ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 350)
  // `q` mudou por fora (voltar/avançar, limpar filtros) → o campo acompanha (ajuste no render, sem efeito).
  // Se veio da própria digitação, não mexe: não apaga o que ainda está sendo digitado.
  const [prevQ, setPrevQ] = useState(search.q)
  if (search.q !== prevQ) {
    setPrevQ(search.q)
    if (search.q !== (debouncedSearch.trim() || undefined)) setSearchInput(search.q ?? '')
  }
  // Só grava quando a digitação muda — reagir ao `q` com o valor antigo desfaria o voltar/limpar.
  const syncedSearch = useRef(debouncedSearch)
  useEffect(() => {
    if (debouncedSearch === syncedSearch.current) return
    syncedSearch.current = debouncedSearch
    const q = debouncedSearch.trim() || undefined
    if (q !== (search.q ?? undefined)) setSearch({ q, page: undefined })
  }, [debouncedSearch, search.q, setSearch])

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const hasFilters = !!(search.action || search.entity || search.actorId || search.ip || search.from || search.to || search.q)
  // A linha "Filtros:" do montador diz a ação e quem pelo nome, como a tela (e a API, no PDF).
  const textosDosFiltros = textosDaAuditoria({
    action: search.action,
    acoes: NOMES_DAS_ACOES,
    actorId: search.actorId,
    quem: admins.find(a => a.id === search.actorId)?.username
      ?? rows.find(r => r.actorId === search.actorId)?.actorName,
  })

  function clearFilters() {
    setSearchInput('')
    navigate({ search: {}, replace: true })
  }

  if (!permLoading && !can('READ_AUDIT')) {
    return <NoPermission message="Você não tem permissão para ver a auditoria." />
  }

  return (
    <PageContainer>
      <PageHeader
        title="Auditoria"
        description="Registro de criações, edições, exclusões, exportações e tentativas de login, com o IP e o aparelho de origem"
        help={<AjudaLink topico="auditoria" titulo="Auditoria" />}
      />

      {/* Tempo de guarda dos registros — só para quem pode configurar a trilha. */}
      {can('UPDATE_AUDIT') && <AuditRetentionPanel />}

      <FilterBar
        actions={
          // Planilha, PDF e "Montar relatório…" (decisão 006), sempre com os filtros da tela
          // (a trilha não tem seleção). A API leva no máximo as 20.000 linhas mais recentes.
          <ExportMenu
            dataset="audit-logs"
            filters={filters}
            total={data ? total : undefined}
            filtered={hasFilters}
            filterTexts={textosDosFiltros}
            cortaNoLimite
          />
        }
      >
        <FilterField label="Buscar" htmlFor="audit-busca" className="sm:w-80">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="audit-busca" placeholder="Buscar por nome do item ou rota..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
        </FilterField>
      </FilterBar>

      {/* Os filtros numa linha embaixo da busca, como nos lançamentos do Financeiro; no
          celular, dois por linha. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end [&>*]:min-w-0">
        <FilterField label="Ação" htmlFor="audit-acao">
          <NativeSelect
            id="audit-acao"
            value={search.action ?? ''}
            onChange={e => setSearch({ action: (e.target.value || undefined) as AuditAction | undefined, page: undefined })}
          >
            <option value="">Todas</option>
            {ACTION_OPTIONS.map(([a, lbl]) => <option key={a} value={a}>{lbl}</option>)}
          </NativeSelect>
        </FilterField>
        <FilterField label="Tipo" htmlFor="audit-tipo">
          <NativeSelect id="audit-tipo" value={search.entity ?? ''} onChange={e => setSearch({ entity: e.target.value || undefined, page: undefined })}>
            <option value="">Todos</option>
            {ENTITIES.map(k => <option key={k} value={k}>{k}</option>)}
          </NativeSelect>
        </FilterField>
        <FilterField label="Quem" htmlFor="audit-quem">
          <NativeSelect id="audit-quem" value={search.actorId ?? ''} onChange={e => setSearch({ actorId: e.target.value || undefined, page: undefined })}>
            <option value="">Todos</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
          </NativeSelect>
        </FilterField>
        <FilterField label="De" htmlFor="audit-de">
          <DatePicker id="audit-de" className="sm:w-40" value={search.from ?? ''} onChange={v => setSearch({ from: v || undefined, page: undefined })} />
        </FilterField>
        <FilterField label="Até" htmlFor="audit-ate">
          <DatePicker id="audit-ate" className="sm:w-40" value={search.to ?? ''} onChange={v => setSearch({ to: v || undefined, page: undefined })} />
        </FilterField>
        {search.ip && (
          <FilterField label="IP">
            <Button
              variant="secondary"
              className="gap-1.5 font-mono"
              title="Tirar o filtro de IP"
              onClick={() => setSearch({ ip: undefined, page: undefined })}
            >
              {search.ip}
              <X className="size-3.5" aria-hidden />
            </Button>
          </FilterField>
        )}
        {hasFilters && (
          <Button variant="ghost" className="w-fit text-muted-foreground" onClick={clearFilters}>
            <X className="size-4" aria-hidden /> Limpar
          </Button>
        )}
      </div>

      {isError && !data && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar a auditoria."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Tabela fixa, sem rolagem lateral: "O que aconteceu" quebra linha e o detalhe
            técnico (método, rota e status) só entra como coluna onde cabe; no resto, ele
            está no detalhe da linha. */}
        <div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[88px] sm:w-[104px]">Quando</TableHead>
                <TableHead className="hidden sm:table-cell sm:w-[140px]">Quem</TableHead>
                <TableHead>O que aconteceu</TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[280px]">Detalhe técnico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0 whitespace-normal">
                    <EmptyState
                      icon={ScrollText}
                      title={hasFilters ? 'Nenhum registro com esses filtros' : 'Nenhum registro ainda'}
                      description={hasFilters ? 'Ajuste ou limpe os filtros.' : 'As ações administrativas aparecem aqui conforme acontecem.'}
                    />
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => {
                const kind = actionKind(r.method)
                const Icon = KIND_ICON[kind]
                const open = expanded.has(r.id)
                const origem = origemLegivel(r)
                return (
                  <Fragment key={r.id}>
                    <TableRow
                      className="cursor-pointer"
                      data-state={open ? 'selected' : undefined}
                      onClick={() => toggleRow(r.id)}
                    >
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground align-top pt-3" title={new Date(r.createdAt).toLocaleString('pt-BR')}>
                        {relativeTime(r.createdAt)}
                      </TableCell>
                      <TableCell className="hidden truncate font-medium text-foreground align-top pt-3 sm:table-cell" title={r.actorName}>{r.actorName}</TableCell>
                      <TableCell className="whitespace-normal align-top pt-3">
                        <div className="flex items-start gap-2">
                          <Icon className={cn('mt-0.5 size-4 shrink-0', KIND_COLOR[kind])} aria-hidden />
                          <div className="min-w-0 flex-1">
                            <span className="break-words text-foreground">{acaoLegivel(r)}</span>
                            {/* No celular a coluna "Quem" sai e o nome vem aqui, junto da origem. */}
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground sm:hidden">{r.actorName}</span>
                              {origem && <span className="sm:hidden"> · </span>}
                              {origem}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-expanded={open}
                            aria-label={open ? 'Esconder detalhes' : 'Ver detalhes'}
                            onClick={e => {
                              e.stopPropagation()
                              toggleRow(r.id)
                            }}
                          >
                            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden truncate font-mono text-xs text-faint-foreground align-top pt-3 xl:table-cell" title={`${r.method} ${r.path} · ${r.statusCode}`}>
                        {r.method} {r.path} · {r.statusCode}
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="bg-muted/50 whitespace-normal">
                          <AuditRowDetails
                            row={r}
                            ipFiltered={!!r.ip && search.ip === r.ip}
                            onFilterIp={ip => setSearch({ ip, page: undefined })}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
    </PageContainer>
  )
}
