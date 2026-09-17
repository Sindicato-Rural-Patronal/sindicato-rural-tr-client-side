import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { requirePermission } from '@/lib/auth-guard'
import { useContactMessages, useMarkContactMessageRead, useDeleteContactMessage } from '@/hooks/useAdmin'
import type { ContactMessage } from '@/hooks/useAdmin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Pagination } from '@/components/ui/pagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import { ExportMenu, ExportOneButton } from '@/components/export/ExportMenu'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import { Mail, MailOpen, Phone, AtSign, Trash2, Search, X, CheckCheck, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_admin/admin/mensagens')({
  beforeLoad: () => requirePermission('READ_CONTACT'),
  component: RouteComponent,
})

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function MessageDialog({
  message,
  onClose,
}: {
  message: ContactMessage | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!message} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {message?.subject || 'Sem assunto'}
            {message && (
              <Badge variant={message.read ? 'secondary' : 'default'} className="text-[10px]">
                {message.read ? 'Lida' : 'Não lida'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className="flex flex-col gap-4">
            {/* Remetente */}
            <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{message.name}</span>
              </div>
              <a href={`mailto:${message.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <AtSign className="size-3.5" />
                {message.email}
              </a>
              {message.phone && (
                <a href={`tel:${message.phone.replace(/\D/g, '')}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="size-3.5" />
                  {message.phone}
                </a>
              )}
              <span className="text-xs text-muted-foreground mt-1">{formatDate(message.createdAt)}</span>
            </div>

            {/* Mensagem */}
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background rounded-lg border p-4 max-h-60 overflow-y-auto">
              {message.message}
            </div>

            <div className="flex justify-end">
              <ExportOneButton dataset="contact-messages" id={message.id} size="sm" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

type ReadFilter = 'all' | 'unread' | 'read'

function RouteComponent() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 350)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  // Seleção múltipla da página visível — limpa ao trocar de página/filtro/busca.
  const selection = useRowSelection()
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Busca (já com debounce) ou filtro mudou → volta à página 1. Ajuste no render, sem efeito.
  const pageResetKey = `${search}|${readFilter}`
  const [prevPageResetKey, setPrevPageResetKey] = useState(pageResetKey)
  if (pageResetKey !== prevPageResetKey) {
    setPrevPageResetKey(pageResetKey)
    setPage(1)
  }

  const readParam = readFilter === 'unread' ? false : readFilter === 'read' ? true : null

  const { data, isLoading, isError } = useContactMessages({ page, limit: 20, read: readParam, search })
  // Contagem global de não-lidas (não só a página atual): consulta leve read:false.
  const { data: unreadData } = useContactMessages({ page: 1, limit: 1, read: false })
  const markRead = useMarkContactMessageRead()
  const deleteMsg = useDeleteContactMessage()

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMsg.mutateAsync(deleteTarget.id)
      selection.remove(deleteTarget.id)
      toast.success('Mensagem excluída.')
      setDeleteTarget(null)
      if (selected?.id === deleteTarget.id) setSelected(null)
    } catch {
      toast.error('Erro ao excluir mensagem.')
    }
  }

  async function exportOne(msg: ContactMessage) {
    setExportingId(msg.id)
    try {
      await downloadExport('contact-messages', { ids: [msg.id] })
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar a mensagem.'))
    } finally {
      setExportingId(null)
    }
  }

  function openMessage(msg: ContactMessage) {
    setSelected(msg)
    if (!msg.read) {
      markRead.mutate({ messageId: msg.id, read: true })
    }
  }

  const messages = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const unreadCount = unreadData?.total ?? 0

  const pageIds = messages.map(m => m.id)
  const allOnPageSelected = selection.pageState(pageIds) === 'all'

  function changePage(p: number) {
    setPage(p)
    selection.clear()
  }
  function changeReadFilter(f: ReadFilter) {
    setReadFilter(f)
    selection.clear()
  }
  function changeSearch(value: string) {
    setSearchInput(value)
    selection.clear()
  }

  async function bulkMarkRead() {
    setBulkBusy(true)
    try {
      const targets = messages.filter(m => selection.isSelected(m.id) && !m.read)
      await Promise.all(targets.map(m => markRead.mutateAsync({ messageId: m.id, read: true })))
      toast.success('Marcadas como lidas.')
      selection.clear()
    } catch { toast.error('Erro ao marcar como lidas.') }
    finally { setBulkBusy(false) }
  }
  async function bulkDelete() {
    setBulkBusy(true)
    const ids = selection.ids
    const results = await Promise.allSettled(ids.map(id => deleteMsg.mutateAsync(id)))
    const deleted = ids.filter((_, i) => results[i].status === 'fulfilled')
    // Tira da seleção só as que saíram; as que falharam continuam marcadas
    selection.remove(...deleted)
    if (selected && deleted.includes(selected.id)) setSelected(null)
    if (deleted.length === ids.length) {
      toast.success(`${ids.length} mensagem(ns) excluída(s).`)
      setBulkDeleteOpen(false)
    } else {
      toast.error('Erro ao excluir as mensagens.')
    }
    setBulkBusy(false)
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Mensagens de Contato
            {unreadCount > 0 && (
              <Badge className="text-xs">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Mensagens enviadas pelo formulário de contato do site</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, e-mail ou assunto..."
            value={searchInput}
            onChange={e => changeSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => changeSearch('')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {(['all', 'unread', 'read'] as ReadFilter[]).map(f => (
            <Button
              key={f}
              size="sm"
              variant={readFilter === f ? 'default' : 'outline'}
              onClick={() => changeReadFilter(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Todas' : f === 'unread' ? 'Não lidas' : 'Lidas'}
            </Button>
          ))}
        </div>
        <ExportMenu
          dataset="contact-messages"
          className="shrink-0"
          filters={{ search: search.trim(), read: readParam ?? undefined }}
          selectedIds={selection.ids}
          total={data?.total}
          filtered={!!search.trim() || readFilter !== 'all'}
        />
      </div>

      {!isLoading && messages.length > 0 && (
        <div className="flex items-center gap-3 mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={allOnPageSelected} onChange={() => selection.togglePage(pageIds)} className="size-4 accent-primary" aria-label="Selecionar todas nesta página" />
            {selection.count > 0 ? `${selection.count} selecionada${selection.count > 1 ? 's' : ''}` : 'Selecionar tudo'}
          </label>
          {selection.count > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" disabled={bulkBusy} onClick={bulkMarkRead}>
                <CheckCheck className="size-4" /> Marcar lidas
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="size-4" /> Excluir
              </Button>
              <Button size="sm" variant="ghost" onClick={selection.clear}>Limpar</Button>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar as mensagens.
        </div>
      )}

      {!isLoading && !isError && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
          <Mail className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhuma mensagem recebida</p>
          <p className="text-xs text-muted-foreground mt-1">As mensagens do formulário de contato aparecerão aqui.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`rounded-xl border px-4 py-3 flex items-center gap-4 transition-all hover:shadow-sm hover:border-primary/30 ${
              selection.isSelected(msg.id) ? 'ring-1 ring-primary/40 ' : ''
            }${msg.read ? 'bg-card' : 'bg-primary/5 border-primary/20'}`}
          >
            <input
              type="checkbox"
              checked={selection.isSelected(msg.id)}
              onChange={() => selection.toggle(msg.id)}
              className="size-4 accent-primary shrink-0"
              aria-label={`Selecionar mensagem de ${msg.name}`}
            />
            <div className="shrink-0 text-muted-foreground">
              {msg.read
                ? <MailOpen className="size-4" />
                : <Mail className="size-4 text-primary" />
              }
            </div>

            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => openMessage(msg)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm truncate ${msg.read ? 'font-normal' : 'font-semibold'}`}>
                  {msg.name}
                </span>
                {!msg.read && <Badge className="text-[10px] py-0 h-4 shrink-0">Nova</Badge>}
                {msg.subject && (
                  <span className="text-xs text-muted-foreground truncate">— {msg.subject}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
            </button>

            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {formatDate(msg.createdAt)}
            </span>

            <Button
              variant="ghost" size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={exportingId === msg.id}
              onClick={e => { e.stopPropagation(); exportOne(msg) }}
              title="Exportar"
              aria-label={`Exportar mensagem de ${msg.name}`}
            >
              {exportingId === msg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            </Button>

            <Button
              variant="ghost" size="icon"
              className="size-7 shrink-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
              onClick={e => { e.stopPropagation(); setDeleteTarget(msg) }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={20}
            onPageChange={changePage}
            showLimitSelector={false}
            isLoading={isLoading}
          />
        </div>
      )}

      <MessageDialog message={selected} onClose={() => setSelected(null)} />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={open => { if (!open) setBulkDeleteOpen(false) }}
        title={`Excluir ${selection.count} mensagem(ns)`}
        description="Esta ação não pode ser desfeita. As mensagens selecionadas serão removidas permanentemente."
        onConfirm={bulkDelete}
        pending={bulkBusy}
        confirmLabel="Excluir todas"
        pendingLabel="Excluindo..."
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir mensagem"
        description={<>Esta ação não pode ser desfeita. A mensagem de <strong>{deleteTarget?.name}</strong> será removida permanentemente.</>}
        onConfirm={handleDelete}
        pending={deleteMsg.isPending}
        confirmLabel="Excluir"
        pendingLabel="Excluindo..."
      />
    </div>
  )
}
