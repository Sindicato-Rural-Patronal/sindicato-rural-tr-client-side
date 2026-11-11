import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, CalendarClock, GraduationCap, Plus, Search } from 'lucide-react'
import { useAdminCourses, useCourseYears, useDeleteCourse } from '@/hooks/useCourse'
import type { CourseCardItem } from '@/hooks/useCourse'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { RowSelection } from '@/hooks/useRowSelection'
import { usePermissions } from '@/hooks/usePermissions'
import {
  COURSE_VIEWS, COURSE_VIEW_HINT, COURSE_VIEW_LABEL, emptyCoursesCopy,
  type CourseView,
} from '@/lib/course-views'
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsWrapClass } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { SelectCheckbox, SelectionInfo, ExportMenu } from '@/components/export/ExportMenu'
import { BulkDeleteButton } from '@/components/export/BulkDeleteButton'
import { AdminCourseCard, CourseCardSkeleton } from '@/components/courses/AdminCourseCard'

// Lista de cursos do painel (/admin/cursos), com as abas "Próximos" e "Armazenados".
// Fica fora do arquivo da rota para poder ser testada. A aba e o ano moram na URL
// (a rota passa os dois); página, busca e itens por página são da própria lista.

const LIMIT_OPTIONS = [8, 16, 24, 32] as const

const VIEW_ICON = { upcoming: CalendarClock, stored: Archive } as const

export function CoursesList({
  view,
  onViewChange,
  year,
  onYearChange,
  selection,
  onOpen,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  view: CourseView
  onViewChange: (view: CourseView) => void
  year: number | undefined
  onYearChange: (year: number | undefined) => void
  /** Vive na rota: excluir um curso pela janela dele também tira o id da seleção. */
  selection: RowSelection
  onOpen: (course: CourseCardItem) => void
  onCreate: () => void
  onEdit: (courseId: string) => void
  onDuplicate: (courseId: string) => void
  onDelete: (course: { id: string; title: string }) => void
}) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(8)
  const [search, setSearch] = useState('')
  // Busca é server-side (o hook aceita `search`); debounce evita 1 request por tecla.
  const debouncedSearch = useDebouncedValue(search, 350)
  // Busca nova (já com debounce) volta para a página 1 — ajustado no próprio render.
  const [pageSearch, setPageSearch] = useState(debouncedSearch)
  if (pageSearch !== debouncedSearch) {
    setPageSearch(debouncedSearch)
    setPage(1)
  }
  // Outra aba é outra lista: volta para a página 1 (busca e ano continuam).
  const [pageView, setPageView] = useState(view)
  if (pageView !== view) {
    setPageView(view)
    setPage(1)
  }

  const { data: anos } = useCourseYears()
  const { data, isLoading, isError, isFetching, refetch } = useAdminCourses({
    page, limit, search: debouncedSearch, year, view,
  })
  // Qualquer filtro ativo: muda o que uma lista vazia significa.
  const filtrando = !!debouncedSearch.trim() || year != null
  const deleteCourse = useDeleteCourse()
  const { t } = useTranslation()
  const { can } = usePermissions()

  const visible = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  // Se a página atual ficou fora do intervalo (ex.: excluir o último card de uma
  // página > 1), volta para a última página válida em vez de mostrar tela vazia.
  // Math.min: se a busca acabou de voltar para a página 1 neste render, fica na 1.
  if (!isLoading && total > 0 && page > totalPages) {
    setPage(p => Math.min(p, totalPages))
  }

  const pageIds = visible.map(c => c.id)
  const pageState = selection.pageState(pageIds)
  const empty = emptyCoursesCopy(view)

  return (
    <Tabs
      value={view}
      // A seleção é da aba que está na tela: ao trocar, zera. Senão "Excluir
      // selecionados" apagaria cursos que a pessoa nem está vendo.
      onValueChange={v => {
        if (v === view) return
        selection.clear()
        onViewChange(v as CourseView)
      }}
      className="gap-4"
    >
      <TabsList className={tabsWrapClass}>
        {COURSE_VIEWS.map(v => {
          const Icon = VIEW_ICON[v]
          return (
            <TabsTrigger key={v} value={v} className="flex items-center gap-1.5">
              <Icon className="size-3.5" />
              {COURSE_VIEW_LABEL[v]}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {/* Uma lista só para as duas abas: o `value` acompanha a aba aberta. */}
      <TabsContent value={view} className="flex flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">{COURSE_VIEW_HINT[view]}</p>
          <p className="text-sm text-muted-foreground">
            {data ? `${total} curso${total !== 1 ? 's' : ''}` : t('common.loading')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.courses.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Ano e busca são controles SEPARADOS: dois cursos com o mesmo nome
              em anos diferentes não se distinguem por texto. */}
          <Select
            value={year ? String(year) : 'all'}
            onValueChange={v => {
              onYearChange(v === 'all' ? undefined : Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-36 shrink-0" aria-label="Filtrar por ano">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {(anos ?? []).map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <span className="hidden sm:inline">Itens por página:</span>
            <Select
              value={String(limit)}
              onValueChange={v => { setLimit(Number(v) as typeof LIMIT_OPTIONS[number]); setPage(1) }}
            >
              <SelectTrigger className="h-9 w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {visible.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <SelectCheckbox
                  checked={pageState === 'all'}
                  indeterminate={pageState === 'some'}
                  onChange={() => selection.togglePage(pageIds)}
                  label="Selecionar todos desta página"
                />
                <span className="hidden md:inline">Selecionar página</span>
              </label>
            )}
            <SelectionInfo count={selection.count} onClear={selection.clear} />
            <BulkDeleteButton
              ids={selection.ids}
              singular="curso"
              plural="cursos"
              allowed={can('DELETE_COURSE')}
              onDelete={id => deleteCourse.mutateAsync(id)}
              onDone={() => selection.clear()}
              className="h-9"
            />
            {/* A exportação respeita a aba e o ano, como a lista: "Todos (N)" é o total da tela. */}
            <ExportMenu
              dataset="courses"
              className="h-9"
              filters={{ view, search: debouncedSearch.trim(), year }}
              selectedIds={selection.ids}
              total={data?.total}
              filtered={filtrando}
              extra={[
                { label: 'Inscrições dos cursos selecionados', dataset: 'registrations', params: { courseIds: selection.ids }, disabled: selection.count === 0 },
                { label: 'Inscrições de todos os cursos', dataset: 'registrations', params: {} },
              ]}
            />
          </div>
        </div>

        {isError && !data && (
          <LoadErrorRetry
            className="rounded-xl border bg-card"
            message={t('courses.error')}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: limit }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && visible.length === 0 && total === 0 && (
          // Filtrando (busca OU ano), lista vazia quer dizer "nada encontrado" —
          // dizer "nenhum curso" e oferecer "Novo curso" seria mentira. Sem filtro,
          // quer dizer que ESTA aba está vazia: o curso pode estar na outra.
          <EmptyState
            icon={GraduationCap}
            title={filtrando ? t('courses.notFound') : empty.title}
            description={filtrando ? t('courses.notFoundHint') : empty.description}
            topico={filtrando ? undefined : 'cursos'}
            action={!filtrando && view === 'upcoming' ? (
              <Button onClick={onCreate}>
                <Plus className="size-4" /> {t('admin.courses.newCourse')}
              </Button>
            ) : undefined}
          />
        )}

        {!isLoading && total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visible.map(course => (
              <AdminCourseCard
                key={course.id}
                course={course}
                onClick={() => onOpen(course)}
                onEdit={can('UPDATE_COURSE') ? () => onEdit(course.id) : undefined}
                onDuplicate={can('CREATE_COURSE') ? () => onDuplicate(course.id) : undefined}
                onDelete={can('DELETE_COURSE') ? () => onDelete({ id: course.id, title: course.title }) : undefined}
                selected={selection.isSelected(course.id)}
                onToggleSelect={() => selection.toggle(course.id)}
              />
            ))}
          </div>
        )}

        {(totalPages > 1 || total > 0) && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            isLoading={isLoading}
            showLimitSelector={false}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
