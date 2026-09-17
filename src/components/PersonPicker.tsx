import { useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAdminUsers } from '@/hooks/useAdmin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { maskCPF } from '@/utils/masks'

// Busca de pessoa do cadastro (nome, e-mail ou CPF) com lista suspensa.
// Usado para vincular pessoa a empresa, Unimed, novo administrador, inscrição
// feita pelo painel etc. Quando não acha, oferece cadastrar em outra aba — assim
// o diálogo aberto não perde o que já foi preenchido.

export type PickedPerson = { id: string; name: string; cpf: string | null }

export function PersonPicker({
  onPick,
  excludeIds,
  excludedLabel = 'já vinculada',
  id,
  placeholder = 'Buscar pessoa por nome, e-mail ou CPF…',
  autoFocus,
  limit = 8,
}: {
  onPick: (p: PickedPerson) => void
  /** Pessoas que aparecem desabilitadas na lista (ex.: já vinculadas). */
  excludeIds?: Set<string>
  excludedLabel?: string
  id?: string
  placeholder?: string
  autoFocus?: boolean
  limit?: number
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const dq = useDebouncedValue(q, 300).trim()
  const { data, isFetching, isError } = useAdminUsers({ search: dq, limit }, { enabled: dq.length >= 2 })
  const { can } = usePermissions()
  const results = dq.length >= 2 ? (data?.data ?? []) : []

  return (
    <div
      className="relative"
      data-escape-owner={open && dq.length >= 2 ? '' : undefined}
      // Fecha só quando o foco sai do campo e da lista (Tab entra nos resultados)
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false) }}
      onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) } }}
    >
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        // Clicar de novo reabre a lista fechada com Esc.
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        className="h-9 pl-9"
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {open && dq.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!isFetching && isError && (
            <div className="px-3 py-2 text-xs text-destructive">Não foi possível buscar pessoas.</div>
          )}
          {!isFetching && !isError && results.length === 0 && (
            <div className="space-y-1 px-3 py-2 text-xs text-muted-foreground">
              <p>Nenhuma pessoa encontrada.</p>
              {can('CREATE_USER') && (<>
              <a
                href="/admin/usuarios/novo"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Cadastrar nova pessoa <ExternalLink className="size-3" />
              </a>
              <p>Abre em outra aba. Depois de salvar, busque de novo aqui.</p>
              </>)}
            </div>
          )}
          {results.map(u => {
            const excluded = excludeIds?.has(u.id) ?? false
            return (
              <button
                key={u.id}
                type="button"
                disabled={excluded}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onPick({ id: u.id, name: u.name, cpf: u.cpf }); setQ(''); setOpen(false) }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate">{u.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {excluded ? excludedLabel : u.cpf ? maskCPF(u.cpf) : ''}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
