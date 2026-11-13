import { createFileRoute } from '@tanstack/react-router'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { apiFetch } from '@/lib/api'
import { whatsappUrl } from '@/lib/contact-links'
import { Mail, MailOpen, Phone, AtSign, Trash2, Search, X, CheckCheck, Download, Loader2, Reply, MailX } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { BulkDeleteButton } from '@/components/export/BulkDeleteButton'
import { usePermissions } from '@/hooks/usePermissions'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar } from '@/components/FilterBar'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SegmentedControl } from '@/components/SegmentedControl'
import { cn } from '@/lib/utils'

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

/** Resposta por e-mail já com o assunto "Re: …". */
function replyMailto(message: ContactMessage): string {
  const subject = message.subject?.trim()
  return subject
    ? `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
    : `mailto:${message.email}`
}

// Volta a mensagem para "não lida". Rota própria para a auditoria registrar qual foi.
function useMarkContactMessageUnread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch(`/admin/contacts/messages/${messageId}/unread`, { method: 'PATCH', body: '{}' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contacts', 'messages'] })
    },
  })
}

function MessageDialog({
  message,
  onClose,
  readPending,
}: {
  message: ContactMessage | null
  onClose: () => void
  /** Ainda marcando como lida (ao abrir): espera antes de deixar voltar para não lida. */
  readPending: boolean
}) {
  const markUnread = useMarkContactMessageUnread()
  const whatsapp = message ? whatsappUrl(message.phone) : null

  async function handleMarkUnread() {
    if (!message) return
    try {
      await markUnread.mutateAsync(message.id)
      toast.success('Mensagem marcada como não lida.')
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao marcar como não lida.'))
    }
  }

  return (
    <Dialog open={!!message} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {message?.subject || 'Sem assunto'}
            {message && (
              <Badge variant={message.read ? 'neutral' : 'warning'}>
                {message.read ? 'Lida' : 'Não lida'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className="flex flex-col gap-4">
            {/* Remetente */}
            <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{message.name}</span>
              </div>
              <a href={`mailto:${message.email}`} className="flex items-center gap-1.5 break-all text-muted-foreground transition-colors hover:text-foreground">
                <AtSign className="size-3.5 shrink-0" aria-hidden />
                {message.email}
              </a>
              {message.phone && (
                <a href={`tel:${message.phone.replace(/\D/g, '')}`} className="flex items-center gap-1.5 text-muted-foreground tabular-nums transition-colors hover:text-foreground">
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  {message.phone}
                </a>
              )}
              <span className="num mt-1 text-xs text-faint-foreground">{formatDate(message.createdAt)}</span>
            </div>

            {/* Mensagem */}
            <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {message.message}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <a href={replyMailto(message)}>
                  <Reply className="size-4" /> Responder por e-mail
                </a>
              </Button>
              {whatsapp && (
                <Button asChild size="sm" variant="outline">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <FaWhatsapp className="size-4" /> Responder no WhatsApp
                  </a>
                </Button>
              )}
              {message.read && (
                <Button size="sm" variant="outline" disabled={markUnread.isPending || readPending} onClick={handleMarkUnread}>
                  {markUnread.isPending ? <Loader2 className="size-4 animate-spin" /> : <MailX className="size-4" />}
                  Marcar como não lida
                </Button>
              )}
              <ExportOneButton dataset="contact-messages" id={message.id} size="sm" className="ml-auto" />
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

  const { data, isLoading, isError, isFetching, refetch } = useContactMessages({ page, limit: 20, read: readParam, search })
  // Contagem global de não-lidas (não só a página atual): consulta leve read:false.
  const { data: unreadData } = useContactMessages({ page: 1, limit: 1, read: false })
  const markRead = useMarkContactMessageRead()
  const deleteMsg = useDeleteContactMessage()
  const { can } = usePermissions()

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
    // Abrir marca como lida: o diálogo já mostra assim (e oferece "Marcar como não lida").
    setSelected(msg.read ? msg : { ...msg, read: true })
    if (!msg.read) {
      markRead.mutate({ messageId: msg.id, read: true }, {
        // A marca na tela veio antes da resposta: se a gravação falhou, volta
        // a mostrar como não lida e avisa (senão ela some da caixa sem ter
        // sido marcada de verdade).
        onError: e => {
          setSelected(cur => (cur?.id === msg.id ? { ...cur, read: false } : cur))
          toast.error(apiErrorMessage(e, 'Não foi possível marcar a mensagem como lida.'))
        },
      })
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
    <PageContainer>
      <PageHeader
        title={<>
          Mensagens de contato
          {unreadCount > 0 && (
            <Badge variant="warning" className="ml-2 align-middle tabular-nums">
              {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </>}
        description="Mensagens enviadas pelo formulário de contato do site"
        help={<AjudaLink topico="mensagens" titulo="Mensagens de contato" />}
      />

      <FilterBar
        actions={<>
          <BulkDeleteButton
            ids={selection.ids}
            singular="mensagem"
            plural="mensagens"
            allowed={can('UPDATE_CONTACT')}
            onDelete={id => deleteMsg.mutateAsync(id)}
            onDone={() => selection.clear()}
            className="h-9 shrink-0"
          />
          <ExportMenu
            dataset="contact-messages"
            className="shrink-0"
            filters={{ search: search.trim(), read: readParam ?? undefined }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={!!search.trim() || readFilter !== 'all'}
            // O montador diz "Só não lidas", como a API no PDF ("Só lidas" vem do catálogo).
            filterTexts={readParam === false ? { read: 'Só não lidas' } : undefined}
          />
        </>}
      >
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Buscar por nome, e-mail ou assunto..."
            aria-label="Buscar por nome, e-mail ou assunto"
            value={searchInput}
            onChange={e => changeSearch(e.target.value)}
            className="pr-9 pl-9"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => changeSearch('')}
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <SegmentedControl
          label="Mostrar mensagens"
          value={readFilter}
          onChange={changeReadFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'unread', label: 'Não lidas' },
            { value: 'read', label: 'Lidas' },
          ]}
        />
      </FilterBar>

      {!isLoading && messages.length > 0 && (
        <div className="-mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-muted px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
            <input type="checkbox" checked={allOnPageSelected} onChange={() => selection.togglePage(pageIds)} className="size-4 accent-primary" aria-label="Selecionar todas nesta página" />
            {selection.count > 0 ? `${selection.count} selecionada${selection.count > 1 ? 's' : ''}` : 'Selecionar tudo'}
          </label>
          {selection.count > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={bulkMarkRead}>
                <CheckCheck className="size-4" /> Marcar lidas
              </Button>
              <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
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
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar as mensagens."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {!isLoading && !isError && messages.length === 0 && (
        search.trim() || readFilter !== 'all' ? (
          <EmptyState framed icon={Mail} title="Nenhuma mensagem encontrada" description="Tente outra busca ou mude o filtro." />
        ) : (
          <EmptyState framed icon={Mail} title="Nenhuma mensagem recebida" description="As mensagens do formulário de contato aparecerão aqui." />
        )
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors sm:gap-4',
                msg.read ? 'bg-card hover:bg-muted/50' : 'bg-secondary hover:bg-accent',
                selection.isSelected(msg.id) && 'ring-1 ring-primary/40',
              )}
            >
              <input
                type="checkbox"
                checked={selection.isSelected(msg.id)}
                onChange={() => selection.toggle(msg.id)}
                className="size-4 shrink-0 accent-primary"
                aria-label={`Selecionar mensagem de ${msg.name}`}
              />
              <div className="shrink-0">
                {msg.read
                  ? <MailOpen className="size-4 text-faint-foreground" aria-label="Lida" />
                  : <Mail className="size-4 text-foreground" aria-label="Não lida" />
                }
              </div>

              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => openMessage(msg)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('truncate text-sm text-foreground', msg.read ? 'font-normal' : 'font-semibold')}>
                    {msg.name}
                  </span>
                  {!msg.read && <Badge variant="warning">Nova</Badge>}
                  {msg.subject && (
                    <span className="truncate text-xs text-muted-foreground">— {msg.subject}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{msg.message}</p>
                <p className="num mt-0.5 text-xs text-faint-foreground sm:hidden">{formatDate(msg.createdAt)}</p>
              </button>

              <span className="num hidden shrink-0 text-xs text-faint-foreground sm:block">
                {formatDate(msg.createdAt)}
              </span>

              <RowActions
                className="shrink-0"
                label={`Ações da mensagem de ${msg.name}`}
                actions={[
                  { label: 'Exportar', icon: Download, busy: exportingId === msg.id, onClick: () => void exportOne(msg) },
                  { label: 'Excluir', icon: Trash2, destructive: true, onClick: () => setDeleteTarget(msg) },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={20}
          onPageChange={changePage}
          showLimitSelector={false}
          isLoading={isLoading}
        />
      )}

      <MessageDialog message={selected} onClose={() => setSelected(null)} readPending={markRead.isPending} />

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
    </PageContainer>
  )
}
