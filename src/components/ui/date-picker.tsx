import * as React from "react"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { toYmd } from "@/utils/dates"
import { maskDateBr, parseDateBr, ymdToBr } from "@/utils/date-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const ymd = value.slice(0, 10)
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

interface DatePickerProps {
  /** ISO date string "YYYY-MM-DD" (or "" for empty). */
  value: string
  /** Called with a "YYYY-MM-DD" string (or "" when cleared). */
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  placeholder?: string
  className?: string
  /** Earliest selectable year (default 1920). */
  fromYear?: number
  /** Latest selectable year (default current year + 5). */
  toYear?: number
}

/**
 * Data digitável (dd/mm/aaaa) com botão de calendário ao lado. O formulário só
 * recebe data completa e válida (ou "" quando o campo é esvaziado). Texto
 * incompleto/inválido não apaga a data: ao sair do campo o texto volta para a
 * data anterior e aparece o aviso — salvar nunca grava vazio sem querer.
 */
export function DatePicker({
  value,
  onChange,
  disabled,
  id,
  placeholder = "dd/mm/aaaa",
  className,
  fromYear = 1920,
  toYear = new Date().getFullYear() + 5,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [text, setText] = React.useState(() => ymdToBr(value))
  // Último valor que o formulário conhece (recebido ou enviado por aqui). Se o
  // `value` mudar por fora (reset, carregar dados), o texto acompanha.
  const [known, setKnown] = React.useState(value)
  const [notice, setNotice] = React.useState<string | null>(null)
  if (value !== known) {
    setKnown(value)
    setText(ymdToBr(value))
    setNotice(null)
  }

  const selected = parseYmd(value)
  const parsed = parseDateBr(text, { fromYear, toYear })
  // Completo e inválido já marca enquanto digita; incompleto só ao sair (vira aviso).
  const invalid = (text !== "" && parsed === null && text.length === 10) || !!notice

  function emit(next: string) {
    if (next === known) return
    setKnown(next)
    onChange(next)
  }

  function handleType(raw: string) {
    const next = maskDateBr(raw)
    setText(next)
    setNotice(null)
    if (next === "") emit("")
    else {
      const date = parseDateBr(next, { fromYear, toYear })
      if (date) emit(date)
    }
  }

  function handleBlur() {
    setFocused(false)
    if (text === "" || parseDateBr(text, { fromYear, toYear })) return
    setText(ymdToBr(known))
    setNotice(known ? `Data inválida. Mantida ${ymdToBr(known)}.` : "Data inválida. O campo ficou vazio.")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full">
          <div className="relative">
          <Input
            id={id}
            value={text}
            onChange={e => handleType(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            aria-invalid={invalid || undefined}
            aria-describedby={notice && id ? `${id}-notice` : undefined}
            title={invalid ? "Data inválida" : undefined}
            className={cn("h-9 pr-10", className)}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Abrir calendário"
              title="Abrir calendário"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          </div>
          {notice && !focused && (
            <p id={id ? `${id}-notice` : undefined} role="alert" className="mt-1 text-xs text-destructive">{notice}</p>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            const next = date ? toYmd(date) : ""
            setText(ymdToBr(next))
            setNotice(null)
            emit(next)
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
