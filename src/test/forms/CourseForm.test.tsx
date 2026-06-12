import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'admin.courses.form.title': 'Título',
        'admin.courses.form.startDate': 'Data início *',
        'admin.courses.form.endDate': 'Data término *',
        'admin.courses.form.status': 'Status',
        'admin.courses.form.statusDraft': 'Rascunho',
        'admin.courses.form.statusPrivate': 'Privado',
        'admin.courses.form.statusPublic': 'Público',
        'admin.courses.form.room': 'Sala',
        'admin.courses.form.selectRoom': 'Selecionar sala',
        'admin.courses.form.eventNumber': 'Nº Evento',
        'admin.courses.form.price': 'Preço',
        'admin.courses.form.workload': 'Carga horária',
        'admin.courses.form.minStudents': 'Mín. alunos',
        'admin.courses.form.observations': 'Observações',
        'admin.courses.form.regDeadlineDate': 'Prazo inscrições',
        'admin.courses.form.fullDescription': 'Descrição completa',
        'admin.courses.form.create': 'Criar',
        'admin.courses.form.save': 'Salvar',
        'admin.courses.form.creating': 'Criando...',
        'admin.courses.form.saving': 'Salvando...',
        'admin.courses.newCourse': 'Novo Curso',
        'admin.courses.editCourse': 'Editar Curso',
        'admin.courses.tabs.info': 'Informações',
        'admin.courses.tabs.description': 'Descrição',
        'admin.courses.tabs.images': 'Imagens',
        'admin.courses.bannerUpload': 'Upload Banner',
        'admin.courses.galleryUpload': 'Adicionar foto',
        'admin.courses.galleryEmpty': 'Sem fotos',
        'common.cancel': 'Cancelar',
        'common.loading': 'Carregando...',
        'validation.roomRequired': 'Sala obrigatória',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/hooks/useRooms', () => ({
  useRooms: () => ({ data: [{ id: 'room-1', name: 'Sala A', maxCapacity: 30 }], isLoading: false }),
  useCreateRoom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useCourse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCourse')>()
  return {
    ...actual,
    useAdminCourses: () => ({ data: [], isLoading: false, isError: false }),
    useAdminCourse: () => ({ data: null, isLoading: false }),
    useCreateCourse: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useUpdateCourse: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useDeleteCourse: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useUploadBanner: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUploadGalleryPhoto: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteGalleryPhoto: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

vi.mock('@/hooks/useAdmin', () => ({
  useCourseRegistrations: () => ({ data: [], isLoading: false }),
  useCancelRegistration: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, cannot: () => false, isLoading: false, perms: [] }),
}))

vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="md-editor" value={value} onChange={e => onChange(e.target.value)} />
  ),
}))

vi.mock('@uiw/react-md-editor/markdown-editor.css', () => ({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => () => ({ component: () => null }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

async function renderCourseFormDialog(editing: null | object = null) {
  const { CourseFormDialog } = await import('@/routes/_admin/admin/cursos/index')
  render(
    <CourseFormDialog open editing={editing as never} onClose={vi.fn()} />,
    { wrapper }
  )
}

describe('CourseFormDialog — criação', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renderiza título "Novo Curso"', async () => {
    await renderCourseFormDialog(null)
    expect(screen.getByText('Novo Curso')).toBeInTheDocument()
  })

  it('botão Criar desabilitado com form inválido', async () => {
    await renderCourseFormDialog(null)
    const btn = screen.getByRole('button', { name: 'Criar' })
    expect(btn).toBeDisabled()
  })

  it('botão Criar habilitado após preencher campos obrigatórios', async () => {
    const user = userEvent.setup()
    await renderCourseFormDialog(null)

    await user.type(screen.getByPlaceholderText(/Manejo/i), 'Curso de Soja')

    const [startDate, endDate] = screen.getAllByDisplayValue('')
      .filter(el => (el as HTMLInputElement).type === 'date')
    await user.type(startDate, '2025-06-01')
    await user.type(endDate, '2025-06-30')

    const [startHour, endHour] = screen.getAllByDisplayValue('')
      .filter(el => (el as HTMLInputElement).type === 'time')
    await user.type(startHour, '08:00')
    await user.type(endHour, '17:00')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Criar' })).not.toBeDisabled()
    })
  })
})
