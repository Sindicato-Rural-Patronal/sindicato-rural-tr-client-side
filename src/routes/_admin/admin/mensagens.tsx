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
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Mail, MailOpen, Phone, AtSign, ChevronLeft, ChevronRight, Trash2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useEffect, useRef } from 'react'

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

type ReadFilter = 'all' | 'unread' | 'read'

function RouteComponent() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchInput])

  // reset page on filter change
  useEffect(() => { setPage(1) }, [readFilter])

  const readParam = readFilter === 'unread' ? false : readFilter === 'read' ? true : null

  const { data, isLoading } = useContactMessages({ page, limit: 20, read: readParam, search })
  // Contagem global de não-lidas (não só a página atual): consulta leve read:false.
  const { data: unreadData } = useContactMessages({ page: 1, limit: 1, read: false })
  const markRead = useMarkContactMessageRead()
  const deleteMsg = useDeleteContactMessage()

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMsg.mutateAsync(deleteTarget.id)
      toast.success('Mensagem excluída.')
      setDeleteTarget(null)
      if (selected?.id === deleteTarget.id) setSelected(null)
    } catch {
      toast.error('Erro ao excluir mensagem.')
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
  const unreadCount = unreadData?.total ?? 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
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
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearchInput(''); setSearch('') }}
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
              onClick={() => setReadFilter(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Todas' : f === 'unread' ? 'Não lidas' : 'Lidas'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && messages.length === 0 && (
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
              msg.read ? 'bg-card' : 'bg-primary/5 border-primary/20'
            }`}
          >
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
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline" size="sm" className="gap-1"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="size-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline" size="sm" className="gap-1"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <MessageDialog message={selected} onClose={() => setSelected(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir mensagem</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A mensagem de <strong>{deleteTarget?.name}</strong> será removida permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMsg.isPending}>
              {deleteMsg.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
