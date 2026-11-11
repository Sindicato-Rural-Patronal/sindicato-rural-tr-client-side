import { useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { filtrarGrupos, type CatalogField, type ExportCatalog } from '@/components/export/report-builder'

// A lista de campos do montador: agrupada como o catálogo manda, com busca.
// Marcar põe o campo no fim das colunas. Campo sem permissão aparece
// desligado, com o motivo, em vez de sumir.

/** Etiqueta "pessoal" / "sensível" ao lado do nome do campo. */
export function PrivacyBadge({ privacy }: { privacy: CatalogField['privacy'] }) {
  if (privacy === 'comum') return null
  return (
    <Badge
      variant={privacy === 'sensivel' ? 'destructive' : 'outline'}
      className="h-4 shrink-0 px-1.5 text-[10px] font-normal"
    >
      {privacy === 'sensivel' ? 'sensível' : 'pessoal'}
    </Badge>
  )
}

export function ReportFieldPicker({
  catalog,
  selected,
  onToggle,
  busca,
  onBusca,
  grande = false,
  autoFocus = false,
}: {
  catalog: ExportCatalog
  /** Chaves já escolhidas. */
  selected: string[]
  onToggle: (key: string) => void
  busca: string
  onBusca: (busca: string) => void
  /** Celular: uma coluna e alvo de 44 px. */
  grande?: boolean
  autoFocus?: boolean
}) {
  // Abertos de início: os grupos que já têm campo escolhido (ou o primeiro).
  const [abertos, setAbertos] = useState<Set<string>>(() => {
    const comEscolhido = catalog.groups.filter(g => g.fields.some(f => selected.includes(f.key))).map(g => g.name)
    return new Set(comEscolhido.length ? comEscolhido : catalog.groups.slice(0, 1).map(g => g.name))
  })
  const grupos = filtrarGrupos(catalog.groups, busca)
  const buscando = busca.trim() !== ''
  const cheio = selected.length >= catalog.limits.fields

  function alternarGrupo(nome: string) {
    setAbertos(atual => {
      const novo = new Set(atual)
      if (novo.has(nome)) novo.delete(nome)
      else novo.add(nome)
      return novo
    })
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={busca}
          onChange={e => onBusca(e.target.value)}
          placeholder="Procurar campo…"
          aria-label="Procurar campo"
          className={cn('pl-8', grande && 'h-11')}
          autoFocus={autoFocus}
        />
      </div>

      {grupos.length === 0 && (
        <p className="px-1 py-3 text-sm text-muted-foreground">Nenhum campo com “{busca.trim()}”.</p>
      )}

      <div className="flex flex-col gap-1">
        {grupos.map(grupo => {
          const aberto = buscando || abertos.has(grupo.name)
          const marcados = grupo.fields.filter(f => selected.includes(f.key)).length
          const idLista = `campos-${grupo.name.replace(/\W+/g, '-')}`
          return (
            <section key={grupo.name} className="flex flex-col">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 text-left text-sm font-medium text-foreground hover:bg-muted',
                  grande ? 'min-h-11' : 'min-h-8',
                )}
                aria-expanded={aberto}
                aria-controls={idLista}
                onClick={() => alternarGrupo(grupo.name)}
                disabled={buscando}
              >
                <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-90')} aria-hidden />
                {grupo.name}
                {marcados > 0 && <span className="text-xs font-normal text-muted-foreground">({marcados})</span>}
              </button>
              {aberto && (
                <ul id={idLista} className={cn('grid gap-x-3 pb-1 pl-6', grande ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                  {grupo.fields.map(campo => {
                    const marcado = selected.includes(campo.key)
                    const desligado = !campo.allowed || (!marcado && cheio)
                    return (
                      <li key={campo.key} className="min-w-0">
                        <label
                          className={cn(
                            'flex items-start gap-2 rounded-md px-1 text-sm',
                            grande ? 'min-h-11 py-2.5' : 'py-1',
                            desligado ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer hover:bg-muted',
                          )}
                          title={!campo.allowed ? campo.reason ?? 'Sem permissão para este campo' : !marcado && cheio ? `No máximo ${catalog.limits.fields} campos por relatório.` : undefined}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                            checked={marcado}
                            disabled={desligado}
                            onChange={() => onToggle(campo.key)}
                          />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="break-words">{campo.label}</span>
                              <PrivacyBadge privacy={campo.privacy} />
                            </span>
                            {!campo.allowed && (
                              <span className="text-xs text-muted-foreground">{campo.reason ?? 'Sem permissão para este campo.'}</span>
                            )}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
