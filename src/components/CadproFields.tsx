import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

const MAX_CADPRO = 5

// Edita a lista de CAD/PRO do associado (até MAX_CADPRO). Opera no array cru (pode ter
// entradas vazias durante a edição); o formulário filtra vazios ao salvar.
export function CadproFields({ value, onChange, disabled }: {
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const items = value.length ? value : ['']

  function update(i: number, v: string) {
    const next = [...items]
    next[i] = v
    onChange(next)
  }
  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i)
    onChange(next.length ? next : [''])
  }
  function add() {
    if (items.length < MAX_CADPRO) onChange([...items, ''])
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="h-9"
            disabled={disabled}
            value={c}
            onChange={e => update(i, e.target.value)}
            placeholder={`CAD/PRO ${i + 1}`}
          />
          {items.length > 1 && !disabled && (
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(i)} aria-label="Remover CAD/PRO">
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}
      {items.length < MAX_CADPRO && !disabled && (
        <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={add}>
          <Plus className="size-3.5" /> Adicionar CAD/PRO
        </Button>
      )}
    </div>
  )
}
