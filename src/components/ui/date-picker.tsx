import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const ymd = value.slice(0, 10)
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

/** Format a Date to "YYYY-MM-DD" using local parts (no timezone shift). */
function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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

export function DatePicker({
  value,
  onChange,
  disabled,
  id,
  placeholder = "Selecione a data",
  className,
  fromYear = 1920,
  toYear = new Date().getFullYear() + 5,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseYmd(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start px-3 font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 opacity-70" />
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
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
            onChange(date ? toYmd(date) : "")
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
