import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('@/hooks/useRooms', () => ({
  useRooms: () => ({ data: [{ id: 'room-1', name: 'Sala A', maxCapacity: 30 }], isLoading: false }),
  useCreateRoom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const createMutate = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useCourse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCourse')>()
  return {
    ...actual,
    useAdminCourses: () => ({ data: [], isLoading: false, isError: false }),
    useAdminCourse: () => ({ data: null, isLoading: false }),
    useCreateCourse: () => ({ mutateAsync: createMutate, isPending: false }),
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

// DatePicker real = Radix Popover + react-day-picker (portais/pointer capture, frágil
// no jsdom). O teste só precisa do valor "YYYY-MM-DD" chegando no form.
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input type="date" data-testid="date-picker" value={value} onChange={e => onChange(e.target.value)} />
  ),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => () => ({ component: () => null }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

async function renderCourseFormDialog(editing: null | object = null) {
  const { CourseFormDialog } = await import('@/components/courses/CourseFormDialog')
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
  }, 15000)

  it('botão Criar desabilitado com form inválido', async () => {
    await renderCourseFormDialog(null)
    const btn = screen.getByRole('button', { name: 'Criar' })
    expect(btn).toBeDisabled()
  }, 15000)

  // O botão segue a validade do schema (título, datas e horários de início/fim).
  // A sala é cobrada só no submit, então não entra aqui.
  it('botão Criar habilitado após preencher campos obrigatórios', async () => {
    const user = userEvent.setup()
    await renderCourseFormDialog(null)

    const btn = screen.getByRole('button', { name: 'Criar' })
    await user.type(screen.getByPlaceholderText(/Manejo/i), 'Curso de Soja')

    const [startDate, endDate] = screen.getAllByTestId('date-picker')
    fireEvent.change(startDate, { target: { value: '2026-10-01' } })
    fireEvent.change(endDate, { target: { value: '2026-10-02' } })

    const [startHour, endHour] = screen.getAllByDisplayValue('')
      .filter(el => (el as HTMLInputElement).type === 'time')
    await user.type(startHour, '08:00')
    expect(btn).toBeDisabled()
    await user.type(endHour, '17:00')

    await waitFor(() => expect(btn).not.toBeDisabled())
  }, 15000)
})

describe('CourseFormDialog — duplicar curso', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const original = {
    id: 'course-1',
    status: 'PUBLIC',
    title: 'MANEJO DE PASTAGEM',
    description: 'Conteúdo',
    maxStudents: 30,
    minStudents: 5,
    enrolled: 10,
    preEnrolled: 0,
    waitlist: 0,
    coverImage: 'https://storage.example.com/banner.jpg',
    price: 0,
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    startTime: '08:00',
    endTime: '17:00',
    workloadHours: 16,
    location: 'Sala A',
    instructorName: 'Fulano',
    registrationDeadline: '2026-08-05',
    observations: '',
    eventNumber: '261676',
    photoGallery: [],
    instructors: [
      { id: 'a1', userDataId: 'u1', title: 'AGRONOMO', category: null, name: 'Fulano', bio: null, avatar: null, linkedin: null, instagram: null, facebook: null },
      { id: 'a2', userDataId: 'u2', title: null, category: null, name: 'Beltrano', bio: null, avatar: null, linkedin: null, instagram: null, facebook: null },
    ],
  }

  it('abre preenchido, sem datas nem nº do evento, e pede a cópia da capa e dos instrutores marcados', async () => {
    createMutate.mockResolvedValue({ json: () => Promise.resolve({ id: 'new', coverCopied: true, instructorsCopied: 1 }) })
    const { CourseFormDialog } = await import('@/components/courses/CourseFormDialog')
    render(
      <CourseFormDialog open editing={null} duplicateOf={original as never} onClose={vi.fn()} />,
      { wrapper },
    )

    expect(screen.getByText('Duplicar curso')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Manejo/i)).toHaveValue('MANEJO DE PASTAGEM')
    expect(screen.getByPlaceholderText('Ex: 261676')).toHaveValue('')
    expect(screen.getByText(/Não aparece no site/)).toBeInTheDocument() // dica do status Rascunho

    // tira o Beltrano da cópia
    fireEvent.click(screen.getByRole('checkbox', { name: /Beltrano/ }))

    const [startDate, endDate] = screen.getAllByTestId('date-picker')
    fireEvent.change(startDate, { target: { value: '2026-10-01' } })
    fireEvent.change(endDate, { target: { value: '2026-10-02' } })

    const btn = screen.getByRole('button', { name: 'Criar' })
    await waitFor(() => expect(btn).not.toBeDisabled())
    fireEvent.click(btn)

    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    const body = createMutate.mock.calls[0][0]
    expect(body).toMatchObject({
      name: 'MANEJO DE PASTAGEM',
      status: 'UNPUBLISHED',
      roomId: 'room-1',
      startTime: '2026-10-01T08:00:00.000Z',
      endTime: '2026-10-02T17:00:00.000Z',
      workloadHours: 16,
      minStudents: 5,
      copyCoverFromCourseId: 'course-1',
      copyInstructorsFromCourseId: 'course-1',
      instructorAssignmentIds: ['a1'],
    })
    expect(body.eventNumber).toBeUndefined()
    expect(body.registrationDeadline).toBeUndefined()
  }, 15000)
})
