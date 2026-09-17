import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, CornerDownLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { usePermissions } from '@/hooks/usePermissions'
import { NAV_ITEMS, OPEN_COMMAND_PALETTE_EVENT, filterNavItems, type NavItem } from '@/lib/command-palette'

// Paleta de comando: Ctrl/Cmd+K (ou o botão "Buscar" da barra lateral) abre;
// digite para filtrar telas; ↑↓ navega; Enter abre.
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
        // Abrir ou fechar sempre recomeça: busca vazia e 1º item destacado.
        setQ('')
        setIdx(0)
      }
    }
    function onOpenRequest() {
      setOpen(true)
      setQ('')
      setIdx(0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest)
    }
  }, [])

  const items = filterNavItems(NAV_ITEMS, q, can)

  function close() {
    setOpen(false)
    setQ('')
    setIdx(0)
  }

  function go(item: NavItem) {
    close()
    navigate({ to: item.to as string, search: item.search as never })
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) go(items[idx]) }
  }

  return (
    <Dialog open={open} onOpenChange={o => (o ? setOpen(true) : close())}>
      <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Buscar telas</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0) }}
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
            <li key={n.label}>
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
