import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, CornerDownLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { usePermissions } from '@/hooks/usePermissions'

type NavItem = { label: string; to: string; perm: string | null; hint?: string; search?: Record<string, string> }

const NAV: NavItem[] = [
  { label: 'Painel', to: '/admin/dashboard', perm: null },
  { label: 'Cursos', to: '/admin/cursos', perm: 'READ_COURSE' },
  { label: 'Notícias', to: '/admin/noticias', perm: 'READ_COURSE' },
  { label: 'Usuários', to: '/admin/usuarios', perm: 'READ_USER', hint: 'associados' },
  { label: 'Empresas', to: '/admin/usuarios', search: { tab: 'empresas' }, perm: 'READ_USER', hint: 'cnpj parceiros cadastro' },
  { label: 'Salas', to: '/admin/salas', perm: 'READ_COURSE' },
  { label: 'Banners', to: '/admin/banners', perm: 'READ_BANNER' },
  { label: 'Cotações', to: '/admin/cotacoes', perm: 'READ_MARKET_QUOTE' },
  { label: 'Convênios', to: '/admin/convenios', perm: 'READ_CONVENIO', hint: 'unimed tabela de valores' },
  { label: 'Mensagens', to: '/admin/mensagens', perm: 'READ_CONTACT', hint: 'contato' },
  { label: 'Auditoria', to: '/admin/auditoria', perm: 'READ_AUDIT' },
  { label: 'Financeiro', to: '/admin/financeiro', perm: 'READ_FINANCE', hint: 'caixa lançamentos' },
]

// Paleta de comando: Ctrl/Cmd+K abre; digite para filtrar telas; ↑↓ navega; Enter abre.
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const navigate = useNavigate()
  const { can } = usePermissions()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (!open) setQ('') }, [open])
  useEffect(() => { setIdx(0) }, [q, open])

  const term = q.trim().toLowerCase()
  const items = NAV
    .filter(n => !n.perm || can(n.perm))
    .filter(n => !term || n.label.toLowerCase().includes(term) || (n.hint ?? '').toLowerCase().includes(term))

  function go(item: NavItem) {
    setOpen(false)
    navigate({ to: item.to as string, search: item.search as never })
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) go(items[idx]) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Buscar telas</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Ir para..."
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</li>
          )}
          {items.map((n, i) => (
            <li key={n.to}>
              <button
                type="button"
                onClick={() => go(n)}
                onMouseEnter={() => setIdx(i)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-left ${
                  i === idx ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span className="text-foreground">{n.label}</span>
                {i === idx && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
