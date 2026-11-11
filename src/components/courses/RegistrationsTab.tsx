import { useState } from 'react'
import type { ComponentProps } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FaWhatsapp } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdminCourse, adminCourseQuery, fetchAllCourseRegistrations, useAllCourseRegistrations, useAdminRegisterPerson, useConfirmAllRegistrations, useSetRegistrationAttendance, useMarkUnmarkedAttendance } from '@/hooks/useCourse'
import { useCourseRegistrations, useCancelRegistration, useConfirmRegistration, useStartCourse, useUploadRegistrationFicha, useDeleteRegistrationFicha, openRegistrationFicha } from '@/hooks/useAdmin'
import type { UserDataDetail, Registration } from '@/hooks/useAdmin'
import { apiErrorMessage } from '@/lib/api-error-message'
import { ApiError, apiFetch } from '@/lib/api'
import { alvoDoDocumento, erroDoDocumento, registrarDocumento, TEXTOS_DO_REGISTRO } from '@/lib/registrar-documento'
import { calcAge } from '@/utils/age'
import { hasCourseStarted } from '@/utils/course-status'
import { attendanceCounts, attendanceSummary } from '@/utils/course-attendance'
import { formatDateTimeBrasilia } from '@/utils/format-datetime-brasilia'
import { maskCPF, maskPhone } from '@/utils/masks'
import { whatsappUrl, telHref, uniqueContactLines, phoneKey } from '@/lib/contact-links'
import { copyText } from '@/lib/copy-text'
import { cn } from '@/lib/utils'
import { ExportMenu } from '@/components/export/ExportMenu'
import { PermissionButton } from '@/components/PermissionButton'
import { CheckCheck, CheckCircle2, CircleCheckBig, Circle, ClipboardList, Eye, FileDown, Loader2, Mail, Paperclip, Phone, PlayCircle, UserCheck, UserPlus, UserRoundCheck, UserRoundX, UserX, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Course } from '@/@types/course'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Pagination } from '@/components/ui/pagination'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { MemberBadge } from '@/components/MemberBadge'
import { PersonPicker } from '@/components/PersonPicker'
import type { PickedPerson } from '@/components/PersonPicker'

// Inscrições de um curso (aba "Inscrições" da janela do curso), fora do arquivo da
// rota para poder ser testada. A API entrega da mais antiga para a mais nova
// (ordem de chegada): a tela mostra na ordem recebida, sem reordenar.

/**
 * A ficha de inscrição (uma e "Exportar todas") lê a ficha completa da pessoa
 * (`GET /admin/users/:id`), que pede READ_USER além do READ_COURSE da janela do
 * curso. Sem ela, o botão fica desligado com este motivo (SR-111), como o campo
 * de pessoa no montador das inscrições.
 */
const FICHA_PEDE_LER_USUARIOS = 'Pede a permissão Visualizar usuários'

/**
 * A mensagem de quando a ficha não sai. O 403 da busca da pessoa (a permissão
 * tirada depois que a tela carregou) diz que falta permissão, como o 403 do
 * registro na auditoria, em vez do "Erro ao gerar a ficha de inscrição.".
 */
function erroDaFicha(e: unknown, fallback: string): string {
  if (e instanceof ApiError && e.status === 403) return TEXTOS_DO_REGISTRO.semPermissao
  return erroDoDocumento(e, fallback)
}

// Botão pequeno de ação com dica e nome para leitor de tela; o texto ao lado do
// ícone só aparece em telas largas (no celular fica só o ícone). Com `motivo`, o
// botão fica desligado e a dica diz por quê (como o PermissionButton: o botão
// desligado não recebe o mouse, então a dica fica num invólucro que recebe o foco).
function RowAction({ label, className, motivo, ...props }: { label: string; motivo?: string | null } & ComponentProps<typeof Button>) {
  if (motivo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-hidden">
            <Button
              size="sm"
              variant="ghost"
              aria-label={label}
              className={cn('h-9 min-w-9 gap-1 px-2 text-xs lg:h-7 lg:min-w-7', className)}
              {...props}
              disabled
              style={{ pointerEvents: 'none' }}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="block">{label}</span>
          <span className="block">{motivo}</span>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={label}
          className={cn('h-9 min-w-9 gap-1 px-2 text-xs lg:h-7 lg:min-w-7', className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// Mapeia com concorrência limitada para não inundar a API (preserva a ordem).
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? `1 ${one}` : `${n} ${many}`
}

// Inscrição feita pela equipe: escolhe a pessoa do cadastro.
function AddRegistrationDialog({ courseId, open, onClose, registeredIds }: {
  courseId: string
  open: boolean
  onClose: () => void
  registeredIds?: Set<string>
}) {
  const register = useAdminRegisterPerson(courseId)
  const [picked, setPicked] = useState<PickedPerson | null>(null)

  function close() {
    setPicked(null)
    onClose()
  }

  async function submit() {
    if (!picked) return
    try {
      await register.mutateAsync(picked.id)
      toast.success(`${picked.name} foi inscrito(a) no curso.`)
      close()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível inscrever a pessoa.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen && !register.isPending) close() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrever pessoa</DialogTitle>
          <DialogDescription>
            Busque a pessoa no cadastro. A inscrição já entra confirmada, mesmo depois do prazo de inscrição.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-72">
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="font-medium wrap-break-word">{picked.name}</p>
                {picked.cpf && <p className="text-xs text-muted-foreground font-mono">{maskCPF(picked.cpf)}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPicked(null)} disabled={register.isPending}>
                Trocar
              </Button>
            </div>
          ) : (
            <PersonPicker
              onPick={setPicked}
              excludeIds={registeredIds}
              excludedLabel="já inscrita"
              autoFocus
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={register.isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={!picked || register.isPending}>
            {register.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {register.isPending ? 'Inscrevendo...' : 'Inscrever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RegistrationsTab({
  courseId,
  eventNumber,
  courseTitle,
  courseStatus,
}: {
  courseId: string
  eventNumber: string | null
  courseTitle: string
  courseStatus: string
}) {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data: resp, isLoading, isError: regsError, isFetching: regsFetching, refetch: refetchRegs } = useCourseRegistrations(courseId, { page, limit })
  const registrations = resp?.data ?? []
  const total = resp?.total ?? 0
  const totalPages = resp ? Math.ceil(total / limit) : 1
  // Todas as inscrições (não só a página): quem já está inscrito, pendentes e contatos.
  const allRegs = useAllCourseRegistrations(courseId)
  const cancelReg = useCancelRegistration(courseId)
  const confirmReg = useConfirmRegistration(courseId)
  const confirmAll = useConfirmAllRegistrations(courseId)
  const startCourse = useStartCourse()
  const uploadFicha = useUploadRegistrationFicha(courseId)
  const deleteFicha = useDeleteRegistrationFicha(courseId)
  const [fichaBusyId, setFichaBusyId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const [copying, setCopying] = useState<'phones' | 'emails' | null>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const setAttendance = useSetRegistrationAttendance(courseId)
  const markAllPresent = useMarkUnmarkedAttendance(courseId)
  const [markAllOpen, setMarkAllOpen] = useState(false)
  const [exportingLista, setExportingLista] = useState(false)
  const { data: courseDetail } = useAdminCourse(courseId)
  const queryClient = useQueryClient()
  const { can, isLoading: carregandoPermissoes, isError: semAsPermissoes } = usePermissions()
  const canManage = can('UPDATE_COURSE')
  // Só depois de saber as permissões: carregando ou com falha, o botão fica ligado e quem decide é a API.
  const fichaSemPermissao = !carregandoPermissoes && !semAsPermissoes && !can('READ_USER') ? FICHA_PEDE_LER_USUARIOS : null
  const { t } = useTranslation()

  const inProgress = courseStatus === 'IN_PROGRESS'
  const completed = courseStatus === 'COMPLETED'
  const registeredIds = allRegs.data ? new Set(allRegs.data.map(r => r.userDataId)) : undefined
  const pendingCount = allRegs.data?.filter(r => !r.confirmed).length ?? 0
  // Presença: aparece quando o curso já começou (iniciado, concluído ou chegou o dia do início).
  const started = hasCourseStarted({ status: courseStatus, startDate: courseDetail?.startDate })
  const counts = allRegs.data ? attendanceCounts(allRegs.data) : null
  // "Todos presentes" só marca as confirmadas ainda sem marcar (mesma regra do backend).
  const unmarkedConfirmed = counts?.unmarked ?? 0

  // Cancelar a última inscrição de uma página > 1 deixaria a lista vazia.
  if (resp && total > 0 && page > totalPages) {
    setPage(totalPages)
  }

  async function handleStart() {
    try {
      await startCourse.mutateAsync(courseId)
      toast.success('Curso iniciado! Status: Em andamento.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível iniciar o curso.'))
    } finally {
      setStartOpen(false)
    }
  }

  // Clicar no botão já marcado desmarca (volta a "sem marcar").
  function markAttendance(reg: Registration, value: boolean) {
    const attended = reg.attended === value ? null : value
    setAttendance.mutate(
      { id: reg.id, attended },
      { onError: e => toast.error(apiErrorMessage(e, `Não foi possível marcar a presença de ${reg.userData.name}.`)) },
    )
  }

  async function handleMarkAllPresent() {
    try {
      const { updated } = await markAllPresent.mutateAsync(true)
      toast.success(updated === 1 ? '1 inscrição marcada como presente.' : `${updated} inscrições marcadas como presentes.`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível marcar a presença.'))
    } finally {
      setMarkAllOpen(false)
    }
  }

  // Lista de presença para imprimir: confirmadas, em ordem alfabética, uma folha por dia.
  async function downloadListaPresenca() {
    setExportingLista(true)
    try {
      const { downloadListaPresencaPdf } = await import('@/lib/lista-presenca-pdf')
      const regs = await fetchAllCourseRegistrations(courseId)
      const confirmed = regs.filter(r => r.confirmed)
      if (confirmed.length === 0) {
        toast.error('Nenhuma inscrição confirmada para a lista de presença.')
        return
      }
      const detail: Course = courseDetail ?? await queryClient.fetchQuery<Course>(adminCourseQuery(courseId))
      const instructors = detail.instructors?.length
        ? detail.instructors.map(i => i.name)
        : [detail.instructorName].filter(Boolean)
      // Na auditoria antes de gerar; se não registrar, a lista não sai.
      await registrarDocumento('lista-presenca', {
        linhas: confirmed.length,
        alvo: courseTitle,
        ids: confirmed.map(r => r.id),
      })
      await downloadListaPresencaPdf(
        {
          title: courseTitle,
          eventNumber,
          startDate: detail.startDate,
          endDate: detail.endDate,
          startTime: detail.startTime,
          endTime: detail.endTime,
          location: detail.location,
          instructors,
        },
        confirmed.map(r => ({ name: r.userData.name, cpf: r.userData.cpf })),
        `lista-presenca-${courseTitle}`,
      )
    } catch (e) {
      toast.error(erroDoDocumento(e, 'Erro ao gerar a lista de presença.'))
    } finally {
      setExportingLista(false)
    }
  }

  function toggleConfirmed(reg: Registration) {
    confirmReg.mutate(
      { id: reg.id, confirmed: !reg.confirmed },
      {
        onError: e => toast.error(apiErrorMessage(
          e,
          reg.confirmed ? 'Não foi possível desmarcar a confirmação.' : 'Não foi possível confirmar a inscrição.',
        )),
      },
    )
  }

  async function handleCancel() {
    if (!cancelTarget) return
    try {
      await cancelReg.mutateAsync(cancelTarget.id)
      toast.success('Inscrição cancelada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível cancelar a inscrição.'))
    } finally {
      setCancelTarget(null)
    }
  }

  async function handleConfirmAll() {
    try {
      const { confirmed } = await confirmAll.mutateAsync()
      toast.success(confirmed === 1 ? '1 inscrição confirmada.' : `${confirmed} inscrições confirmadas.`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível confirmar as inscrições.'))
    } finally {
      setConfirmAllOpen(false)
    }
  }

  // Todos os telefones ou e-mails das inscrições do curso, um por linha.
  async function copyContacts(kind: 'phones' | 'emails') {
    setCopying(kind)
    try {
      const regs = allRegs.data ?? await fetchAllCourseRegistrations(courseId)
      const lines = kind === 'phones'
        ? uniqueContactLines(regs.map(r => r.userData.phone), phoneKey)
        : uniqueContactLines(regs.map(r => r.userData.email))
      if (lines.length === 0) {
        toast.error(kind === 'phones' ? 'Nenhuma inscrição tem telefone.' : 'Nenhuma inscrição tem e-mail.')
        return
      }
      if (!await copyText(lines.join('\n'))) {
        toast.error('Não foi possível copiar. Tente de novo.')
        return
      }
      toast.success(kind === 'phones'
        ? `${plural(lines.length, 'telefone copiado', 'telefones copiados')}.`
        : `${plural(lines.length, 'e-mail copiado', 'e-mails copiados')}.`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao buscar as inscrições.'))
    } finally {
      setCopying(null)
    }
  }

  const course = { eventNumber, title: courseTitle }

  async function exportOne(userDataId: string, registrationId: string) {
    setFichaId(userDataId)
    try {
      const { downloadFichaPdf } = await import('@/lib/ficha-inscricao-pdf')
      const user: UserDataDetail = await apiFetch(`/admin/users/${userDataId}`).then(r => r.json())
      await registrarDocumento('ficha-inscricao', {
        linhas: 1,
        alvo: alvoDoDocumento(courseTitle, user.name),
        ids: [registrationId],
      })
      await downloadFichaPdf([{ course, user }], `ficha-${user.name}`)
    } catch (e) {
      toast.error(erroDaFicha(e, t('admin.courses.fichaError')))
    } finally {
      setFichaId(null)
    }
  }

  function baixarAutorizacao() {
    // Termo oficial SENAR (formulário em branco) servido como asset estático
    const a = document.createElement('a')
    a.href = '/termo-autorizacao-menor.pdf'
    a.download = 'termo-autorizacao-menor.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function anexarFicha(regId: string, file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Envie um arquivo PDF.')
      return
    }
    setFichaBusyId(regId)
    try {
      await uploadFicha.mutateAsync({ id: regId, file })
      toast.success('Ficha anexada!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao anexar a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function verFicha(regId: string) {
    setFichaBusyId(regId)
    try {
      await openRegistrationFicha(regId)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao abrir a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function removerFicha(regId: string) {
    setFichaBusyId(regId)
    try {
      await deleteFicha.mutateAsync(regId)
      toast.success('Ficha removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function exportAll() {
    setExportingAll(true)
    try {
      const { downloadFichaPdf } = await import('@/lib/ficha-inscricao-pdf')
      const regs = await fetchAllCourseRegistrations(courseId)
      if (regs.length === 0) {
        toast.error(t('admin.courses.noRegistrations'))
        return
      }
      const users: UserDataDetail[] = await mapWithConcurrency(regs, 5, r =>
        apiFetch(`/admin/users/${r.userDataId}`).then(res => res.json()),
      )
      // Uma linha só na auditoria, com todas as inscrições do curso.
      await registrarDocumento('ficha-inscricao', {
        linhas: users.length,
        alvo: courseTitle,
        ids: regs.map(r => r.id),
        escopo: 'todos',
      })
      await downloadFichaPdf(
        users.map(user => ({ course, user })),
        `fichas-${courseTitle}`,
      )
    } catch (e) {
      toast.error(erroDaFicha(e, t('admin.courses.fichaError')))
    } finally {
      setExportingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {resp ? `${total} ${t('admin.courses.registrations').toLowerCase()}` : t('common.loading')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && can('READ_USER') && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
                <UserPlus className="size-3.5" /> Inscrever pessoa
              </Button>
            )}
            {canManage && pendingCount > 0 && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setConfirmAllOpen(true)}>
                <CheckCheck className="size-3.5" /> Confirmar todas ({pendingCount})
              </Button>
            )}
            {canManage && total > 0 && !inProgress && !completed && (
              <Button size="sm" className="h-8 gap-1.5" disabled={startCourse.isPending} onClick={() => setStartOpen(true)}>
                {startCourse.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
                {t('admin.courses.startCourse')}
              </Button>
            )}
            {inProgress && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                <PlayCircle className="size-3" /> {t('admin.courses.form.statusInProgress')}
              </span>
            )}
            {completed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400">
                <CircleCheckBig className="size-3" /> Concluído
              </span>
            )}
          </div>
        </div>

        {started && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-sm text-foreground">
              <span className="font-medium">Presença:</span>{' '}
              {counts ? attendanceSummary(counts) : t('common.loading')}
            </p>
            {canManage && unmarkedConfirmed > 0 && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setMarkAllOpen(true)}>
                <UserRoundCheck className="size-3.5" /> Todos presentes ({unmarkedConfirmed})
              </Button>
            )}
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={copying === 'phones'} onClick={() => copyContacts('phones')}>
              {copying === 'phones' ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
              Copiar telefones
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={copying === 'emails'} onClick={() => copyContacts('emails')}>
              {copying === 'emails' ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
              Copiar e-mails
            </Button>
            <PermissionButton
              allowed={!fichaSemPermissao}
              noPermissionMessage={FICHA_PEDE_LER_USUARIOS}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              disabled={exportingAll}
              onClick={exportAll}
            >
              {exportingAll ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
              {t('admin.courses.exportAllFichas')}
            </PermissionButton>
            {/* Planilha (CSV ou PDF) das inscrições, gerada no servidor; com o
                catálogo, também "Montar relatório…" (decisão 006). */}
            <ExportMenu
              dataset="registrations"
              label="Planilha"
              size="sm"
              className="h-8 gap-1.5"
              filters={{ courseIds: [courseId] }}
              total={total}
              confirmedTotal={allRegs.data ? allRegs.data.length - pendingCount : undefined}
              filterTexts={{ courseIds: `Curso: ${courseTitle}` }}
            />
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={exportingLista} onClick={downloadListaPresenca} title="Lista de presença para imprimir (inscrições confirmadas)">
              {exportingLista ? <Loader2 className="size-3.5 animate-spin" /> : <ClipboardList className="size-3.5" />}
              Lista de presença
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1"><Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-48" /></div>
            </div>
          ))}
        </div>
      )}

      {regsError && !resp && (
        <LoadErrorRetry
          className="rounded-xl border bg-card"
          message="Não foi possível carregar as inscrições deste curso."
          onRetry={() => void refetchRegs()}
          retrying={regsFetching}
        />
      )}

      {!isLoading && !regsError && registrations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-xl">
          <UserCheck className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">{t('admin.courses.noRegistrations')}</p>
        </div>
      )}

      {registrations.map(reg => {
        const age = calcAge(reg.userData.birthDate)
        const minor = age !== null && age < 18
        const whatsapp = whatsappUrl(reg.userData.phone)
        const tel = telHref(reg.userData.phone)
        return (
          // Dados da pessoa em cima e botões embaixo, em qualquer largura: a janela do
          // curso é estreita e, com presença + ações na mesma linha, o nome sumia.
          <div key={reg.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {reg.userData.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-foreground wrap-break-word">{reg.userData.name}</p>
                  {/* A idade aparece para TODO mundo: quem organiza o curso precisa
                      saber a faixa da turma, não só quem é menor. Vermelho só para
                      o menor, que exige assinatura do responsável. */}
                  {age === null ? (
                    <span
                      className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
                      title="Sem data de nascimento no cadastro"
                    >
                      Idade não informada
                    </span>
                  ) : minor ? (
                    <span
                      className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                      title="Menor de idade — precisa da assinatura do responsável na ficha"
                    >
                      Menor · {age} anos
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-1.5 text-[10px] font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400"
                      title="Maior de idade"
                    >
                      {age} anos
                    </span>
                  )}
                  <MemberBadge person={reg.userData} />
                  {reg.userData.companyMemberships.length > 0 && (
                    <span
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      title={`Vinculado a empresa parceira: ${reg.userData.companyMemberships.map(m => m.company.tradeName || m.company.name).join(', ')}`}
                    >
                      Parceira
                    </span>
                  )}
                  {reg.userData.boardPosition && (
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-1.5 text-[10px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">{reg.userData.boardPosition}</span>
                  )}
                  {reg.userData.publicContact?.title && (
                    <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-1.5 text-[10px] font-medium text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-400">{reg.userData.publicContact.title}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {reg.userData.email && <span className="break-all">{reg.userData.email}</span>}
                  {reg.userData.phone && <span>{maskPhone(reg.userData.phone)}</span>}
                  {reg.userData.cpf && <span className="font-mono">{maskCPF(reg.userData.cpf)}</span>}
                </div>
                {/* Data e hora da inscrição (Brasília) em qualquer largura: a lista vem na
                    ordem de chegada e o horário desempata quem se inscreveu no mesmo dia. */}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Inscrito em{' '}
                  <time dateTime={reg.createdAt} className="tabular-nums">{formatDateTimeBrasilia(reg.createdAt)}</time>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-border/60 pt-2">
              {/* Presença só nas confirmadas; clicar de novo no botão marcado desmarca. */}
              {started && reg.confirmed && (
                <div role="group" aria-label={`Presença de ${reg.userData.name}`} className="mr-1 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={reg.attended === true ? 'default' : 'outline'}
                    aria-pressed={reg.attended === true}
                    title={reg.attended === true ? 'Marcado como presente. Clique para desmarcar.' : 'Marcar como presente'}
                    disabled={!canManage}
                    className={cn('h-9 gap-1 px-2.5 text-xs lg:h-7', reg.attended === true && 'bg-emerald-600 text-white hover:bg-emerald-700')}
                    onClick={() => markAttendance(reg, true)}
                  >
                    <UserRoundCheck className="size-3.5" /> Presente
                  </Button>
                  <Button
                    size="sm"
                    variant={reg.attended === false ? 'default' : 'outline'}
                    aria-pressed={reg.attended === false}
                    title={reg.attended === false ? 'Marcado como falta. Clique para desmarcar.' : 'Marcar falta'}
                    disabled={!canManage}
                    className={cn('h-9 gap-1 px-2.5 text-xs lg:h-7', reg.attended === false && 'bg-red-600 text-white hover:bg-red-700')}
                    onClick={() => markAttendance(reg, false)}
                  >
                    <UserRoundX className="size-3.5" /> Faltou
                  </Button>
                </div>
              )}
              {whatsapp && (
                <RowAction label="Conversar no WhatsApp" asChild className="text-emerald-600 hover:text-emerald-700">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <FaWhatsapp className="size-4" />
                  </a>
                </RowAction>
              )}
              {tel && (
                <RowAction label="Ligar" asChild>
                  <a href={tel}>
                    <Phone className="size-3.5" />
                  </a>
                </RowAction>
              )}
              <RowAction
                label={reg.confirmed ? 'Desmarcar confirmação' : 'Confirmar inscrição'}
                variant={reg.confirmed ? 'ghost' : 'outline'}
                className={reg.confirmed ? 'text-emerald-600 hover:text-emerald-700' : ''}
                disabled={confirmReg.isPending}
                onClick={() => toggleConfirmed(reg)}
              >
                {reg.confirmed ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                <span>{reg.confirmed ? t('admin.courses.confirmed') : t('admin.courses.confirm')}</span>
              </RowAction>
              <RowAction
                label="Baixar ficha de inscrição"
                motivo={fichaSemPermissao}
                disabled={fichaId === reg.userDataId}
                onClick={() => exportOne(reg.userDataId, reg.id)}
              >
                {fichaId === reg.userDataId ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                <span className="hidden lg:inline">{t('admin.courses.ficha')}</span>
              </RowAction>
              {minor && (
                <RowAction
                  label="Baixar termo de autorização do responsável (menor de idade)"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={baixarAutorizacao}
                >
                  <FileDown className="size-3.5" />
                  <span className="hidden lg:inline">Autorização</span>
                </RowAction>
              )}
              {reg.ficha ? (
                <>
                  <RowAction
                    label={`Ver ficha anexada (${reg.ficha.filename})`}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    disabled={fichaBusyId === reg.id}
                    onClick={() => verFicha(reg.id)}
                  >
                    {fichaBusyId === reg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                    <span className="hidden lg:inline">Ver ficha</span>
                  </RowAction>
                  <RowAction
                    label="Remover ficha anexada"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={fichaBusyId === reg.id}
                    onClick={() => removerFicha(reg.id)}
                  >
                    <X className="size-3.5" />
                  </RowAction>
                </>
              ) : (
                <RowAction label="Anexar ficha preenchida (PDF)" asChild>
                  <label className={fichaBusyId === reg.id ? 'pointer-events-none opacity-60' : 'cursor-pointer'}>
                    {fichaBusyId === reg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
                    <span className="hidden lg:inline">Anexar ficha</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => {
                        const input = e.currentTarget
                        const f = input.files?.[0]
                        input.value = ''
                        anexarFicha(reg.id, f)
                      }}
                    />
                  </label>
                </RowAction>
              )}
              <RowAction
                label="Cancelar inscrição"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelTarget(reg)}
              >
                <UserX className="size-3.5" />
              </RowAction>
            </div>
          </div>
        )
      })}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      )}

      <AddRegistrationDialog
        courseId={courseId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        registeredIds={registeredIds}
      />

      <DeleteConfirmDialog
        open={!!cancelTarget}
        onOpenChange={open => { if (!open && !cancelReg.isPending) setCancelTarget(null) }}
        title="Cancelar inscrição"
        description={<>Cancelar a inscrição de <strong>{cancelTarget?.userData.name}</strong> neste curso?</>}
        onConfirm={handleCancel}
        pending={cancelReg.isPending}
        confirmLabel={t('admin.courses.cancelRegistrationConfirm')}
        pendingLabel="Cancelando..."
        cancelLabel="Voltar"
      />

      <AlertDialog open={confirmAllOpen} onOpenChange={open => { if (!confirmAll.isPending) setConfirmAllOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar todas as inscrições</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount === 1
                ? '1 inscrição ainda não confirmada será confirmada.'
                : `${pendingCount} inscrições ainda não confirmadas serão confirmadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmAll.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmAll.isPending}
              onClick={e => { e.preventDefault(); handleConfirmAll() }}
            >
              {confirmAll.isPending ? 'Confirmando...' : `Confirmar ${pendingCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={startOpen} onOpenChange={open => { if (!startCourse.isPending) setStartOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar início do curso</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>O curso passa para "Em andamento": sai da lista do site e não aceita novas inscrições.</p>
                {allRegs.data && (
                  <p className={pendingCount > 0 ? 'font-medium text-amber-700 dark:text-amber-400' : undefined}>
                    {pendingCount === 0
                      ? 'Todas as inscrições estão confirmadas.'
                      : pendingCount === 1
                        ? '1 inscrição ainda não foi confirmada. Dá para iniciar assim mesmo.'
                        : `${pendingCount} inscrições ainda não foram confirmadas. Dá para iniciar assim mesmo.`}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={startCourse.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={startCourse.isPending}
              onClick={e => { e.preventDefault(); handleStart() }}
            >
              {startCourse.isPending ? 'Iniciando...' : 'Iniciar curso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={markAllOpen} onOpenChange={open => { if (!markAllPresent.isPending) setMarkAllOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar todos como presentes</AlertDialogTitle>
            <AlertDialogDescription>
              {unmarkedConfirmed === 1
                ? '1 inscrição confirmada ainda sem presença marcada será marcada como presente.'
                : `${unmarkedConfirmed} inscrições confirmadas ainda sem presença marcada serão marcadas como presentes.`}
              {' '}Quem já está marcado como presente ou falta não muda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markAllPresent.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={markAllPresent.isPending}
              onClick={e => { e.preventDefault(); handleMarkAllPresent() }}
            >
              {markAllPresent.isPending
                ? 'Marcando...'
                : unmarkedConfirmed === 1 ? 'Marcar 1 como presente' : `Marcar ${unmarkedConfirmed} como presentes`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
