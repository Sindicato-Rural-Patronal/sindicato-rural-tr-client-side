import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Globe, Loader2, Repeat, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { DatePicker } from '@/components/ui/date-picker'
import { ErrorAlert } from '@/components/ErrorAlert'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { PersonPicker } from '@/components/PersonPicker'
import { DeleteBookingDialog } from '@/components/agenda/DeleteBookingDialog'
import { useRooms } from '@/hooks/useRooms'
import { useCreateRoomBooking, useUpdateRoomBooking, type RoomBooking } from '@/hooks/useRoomBookings'
import { apiErrorMessage } from '@/lib/api-error-message'
import { ApiError } from '@/lib/api'
import {
  bookingFormToBody, bookingToForm, emptyBookingForm, validateBookingForm,
  type BookingFormValues, type RepeatOption,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'
import { upperNoAccents } from '@/utils/text-format'

export type BookingDialogProps = {
  open: boolean
  /** Reserva a editar; null = nova reserva. */
  booking: RoomBooking | null
  /** Edição pedida mas a reserva ainda está carregando (ou não foi achada). */
  loading?: boolean
  notFound?: boolean
  /** Valores iniciais da nova reserva (dia clicado, sala e horário do filtro/faixa). */
  defaults?: { date?: string; roomId?: string; startHour?: string; endHour?: string }
  canUpdate?: boolean
  canDelete?: boolean
  onClose: () => void
}

/** Diálogo de nova reserva / editar reserva. Cada abertura começa do zero. */
export function BookingDialog(props: BookingDialogProps) {
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(props.open)
  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) setSession(s => s + 1)
  }
  if (props.open && (props.loading || props.notFound)) {
    return (
      <Dialog open onOpenChange={open => { if (!open) props.onClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reserva</DialogTitle>
            <DialogDescription>
              {props.notFound ? 'Esta reserva não foi encontrada. Ela pode ter sido excluída.' : 'Carregando a reserva…'}
            </DialogDescription>
          </DialogHeader>
          {!props.notFound && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />}
        </DialogContent>
      </Dialog>
    )
  }
  return <BookingDialogSession key={`${session}-${props.booking?.id ?? 'new'}`} {...props} />
}

function Field({ label, htmlFor, error, children, className }: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** Botões lado a lado para escolher uma opção (maiores e mais claros que um select). */
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border bg-muted/40 p-1">
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
              active ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: 'NONE', label: 'Não' },
  { value: 'WEEKLY', label: 'Toda semana' },
  { value: 'MONTHLY', label: 'Todo mês' },
]

function BookingDialogSession({ open, booking, defaults, canUpdate = true, canDelete = false, onClose }: BookingDialogProps) {
  const creating = !booking
  const readOnly = !creating && !canUpdate
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const create = useCreateRoomBooking()
  const update = useUpdateRoomBooking()

  const [initial] = useState<BookingFormValues>(() =>
    booking
      ? bookingToForm(booking)
      : emptyBookingForm(defaults?.date ?? '', defaults?.roomId ?? '', defaults?.startHour ?? '', defaults?.endHour ?? ''),
  )
  const [values, setValues] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const pending = create.isPending || update.isPending
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const errors = showErrors ? validateBookingForm(values, { creating }) : {}

  function set<K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) {
    setValues(prev => ({ ...prev, [key]: value }))
    setServerError(null)
  }

  function requestClose() {
    if (pending) return
    if (dirty && !readOnly) setConfirmClose(true)
    else onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    setShowErrors(true)
    setServerError(null)
    if (Object.keys(validateBookingForm(values, { creating })).length > 0) return
    const body = bookingFormToBody(values, { creating })
    try {
      if (booking) {
        await update.mutateAsync({ id: booking.id, body })
        toast.success('Reserva atualizada.')
      } else {
        const res = await create.mutateAsync(body)
        const n = res?.ids?.length ?? 1
        toast.success(n > 1 ? `${n} reservas criadas.` : 'Reserva criada.')
      }
      onClose()
    } catch (err) {
      const msg = apiErrorMessage(err, 'Não foi possível salvar a reserva.')
      // Sala ocupada: a mensagem fica no diálogo, perto do botão de salvar.
      setServerError(msg)
      if (!(err instanceof ApiError && err.status === 409)) toast.error(msg)
    }
  }

  const title = creating ? 'Nova reserva' : readOnly ? 'Reserva' : 'Editar reserva'

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) requestClose() }}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription>
              Eventos e reuniões ocupam a sala no horário marcado. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <fieldset disabled={readOnly || pending} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              {booking?.seriesId && (
                <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <Repeat className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Esta reserva faz parte de uma repetição. As alterações valem só para esta data.
                </p>
              )}

              <Field label="Tipo *">
                <Segmented
                  label="Tipo"
                  value={values.type}
                  options={[{ value: 'EVENT', label: 'Evento' }, { value: 'MEETING', label: 'Reunião' }]}
                  onChange={v => set('type', v)}
                />
              </Field>

              <Field label="Título *" htmlFor="booking-title" error={errors.title}>
                <Input
                  id="booking-title"
                  className="h-10"
                  value={values.title}
                  onChange={e => set('title', upperNoAccents(e.target.value))}
                  placeholder="Ex: Reunião da diretoria"
                  aria-invalid={!!errors.title || undefined}
                  autoFocus={creating}
                />
              </Field>

              <Field label="Sala *" htmlFor="booking-room" error={errors.roomId}>
                <NativeSelect
                  id="booking-room"
                  className="h-10"
                  value={values.roomId}
                  onChange={e => set('roomId', e.target.value)}
                  aria-invalid={!!errors.roomId || undefined}
                >
                  <option value="">{roomsLoading ? 'Carregando salas…' : 'Escolha a sala'}</option>
                  {rooms?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                </NativeSelect>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Data *" htmlFor="booking-date" error={errors.date}>
                  <DatePicker id="booking-date" className="h-10" value={values.date} onChange={v => set('date', v)} />
                </Field>
                <Field label="Início *" htmlFor="booking-start" error={errors.startHour}>
                  <Input
                    id="booking-start"
                    type="time"
                    className="h-10"
                    value={values.startHour}
                    onChange={e => set('startHour', e.target.value)}
                    aria-invalid={!!errors.startHour || undefined}
                  />
                </Field>
                <Field label="Término *" htmlFor="booking-end" error={errors.endHour}>
                  <Input
                    id="booking-end"
                    type="time"
                    className="h-10"
                    value={values.endHour}
                    onChange={e => set('endHour', e.target.value)}
                    aria-invalid={!!errors.endHour || undefined}
                  />
                </Field>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={values.multiDay}
                  onChange={e => set('multiDay', e.target.checked)}
                />
                Termina em outro dia
              </label>
              {values.multiDay && (
                <Field label="Data de término *" htmlFor="booking-end-date" error={errors.endDate} className="sm:max-w-[calc(33.333%-0.667rem)]">
                  <DatePicker id="booking-end-date" className="h-10" value={values.endDate} onChange={v => set('endDate', v)} />
                </Field>
              )}

              <Field label="Responsável">
                <Segmented
                  label="Como informar o responsável"
                  value={values.responsibleMode}
                  options={[{ value: 'person', label: 'Pessoa do cadastro' }, { value: 'name', label: 'Digitar o nome' }]}
                  onChange={v => set('responsibleMode', v)}
                />
                {values.responsibleMode === 'person' ? (
                  values.responsible ? (
                    <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/30 pl-3 pr-1 text-sm">
                      <span className="truncate font-medium">{values.responsible.name}</span>
                      {!readOnly && (
                        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => set('responsible', null)}>
                          <X className="size-4" /> Trocar
                        </Button>
                      )}
                    </div>
                  ) : readOnly ? (
                    <p className="text-sm text-muted-foreground">Sem responsável.</p>
                  ) : (
                    <PersonPicker
                      id="booking-responsible"
                      onPick={person => set('responsible', { id: person.id, name: person.name })}
                      placeholder="Buscar por nome, e-mail ou CPF (opcional)"
                    />
                  )
                ) : (
                  <Input
                    id="booking-responsible-name"
                    aria-label="Nome do responsável"
                    className="h-10"
                    value={values.responsibleName}
                    onChange={e => set('responsibleName', upperNoAccents(e.target.value))}
                    placeholder="Nome de quem não está no cadastro (opcional)"
                  />
                )}
              </Field>

              <Field label="Descrição" htmlFor="booking-description">
                <Textarea
                  id="booking-description"
                  rows={3}
                  value={values.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Observações para a equipe (opcional)"
                />
              </Field>

              {/* Só evento pode ir para o site; reunião fica sempre interna. */}
              {values.type === 'EVENT' && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      id="booking-public"
                      type="checkbox"
                      role="switch"
                      className="size-5 accent-primary"
                      checked={values.publicOnSite}
                      onChange={e => set('publicOnSite', e.target.checked)}
                    />
                    <Globe className="size-4 text-muted-foreground" aria-hidden />
                    Mostrar no site
                  </label>
                  <p className="text-sm text-muted-foreground">
                    O título, a data, o horário e a sala aparecem na página de eventos do site.
                    A descrição acima continua só para a equipe.
                  </p>
                  {values.publicOnSite && (
                    <Field label="Texto do evento no site" htmlFor="booking-public-description">
                      <Textarea
                        id="booking-public-description"
                        rows={3}
                        value={values.publicDescription}
                        onChange={e => set('publicDescription', e.target.value)}
                        placeholder="O que o público vê sobre o evento (opcional)"
                      />
                    </Field>
                  )}
                </div>
              )}

              {creating && (
                <Field label="Repetir">
                  <Segmented label="Repetir" value={values.repeat} options={REPEAT_OPTIONS} onChange={v => set('repeat', v)} />
                  {values.repeat !== 'NONE' && (
                    <div className="flex flex-col gap-1.5 sm:max-w-[calc(50%-0.5rem)]">
                      <Label htmlFor="booking-repeat-until" className="text-sm font-medium">Repetir até *</Label>
                      <DatePicker
                        id="booking-repeat-until"
                        className="h-10"
                        value={values.repeatUntil}
                        onChange={v => set('repeatUntil', v)}
                      />
                      {errors.repeatUntil && <p role="alert" className="text-sm text-destructive">{errors.repeatUntil}</p>}
                    </div>
                  )}
                </Field>
              )}

              {serverError && (
                <div role="alert">
                  <ErrorAlert message={serverError} />
                </div>
              )}
            </fieldset>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/30 px-5 py-3">
              {!creating && canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 className="size-4" /> Excluir
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" className="h-10 px-4" onClick={requestClose} disabled={pending}>
                  {readOnly ? 'Fechar' : 'Cancelar'}
                </Button>
                {!readOnly && (
                  <Button type="submit" className="h-10 px-4" disabled={pending}>
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {pending ? 'Salvando...' : creating ? 'Criar reserva' : 'Salvar'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={confirmClose}
        onConfirm={() => { setConfirmClose(false); onClose() }}
        onCancel={() => setConfirmClose(false)}
      />

      {booking && deleting && (
        <DeleteBookingDialog
          booking={booking}
          onClose={() => setDeleting(false)}
          onDeleted={() => onClose()}
        />
      )}
    </>
  )
}
