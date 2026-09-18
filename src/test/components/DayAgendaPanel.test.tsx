import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { RoomBooking } from '@/hooks/useRoomBookings'

// Painel da agenda do dia dentro do Painel Geral: só as portas de entrada de
// criar/editar reserva. As chamadas à API ficam simuladas.
const reserva: RoomBooking = {
  id: 'b1', type: 'MEETING', title: 'REUNIAO DA DIRETORIA', description: null,
  publicOnSite: false, publicDescription: null, roomId: 'r2', roomName: 'SALA 1',
  startTime: '2026-09-17T14:00:00.000Z', endTime: '2026-09-17T16:00:00.000Z',
  responsible: null, responsibleName: null, seriesId: null,
}

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, cannot: () => false, isLoading: false, perms: [] }),
}))
vi.mock('@/hooks/useRooms', () => ({
  useRooms: () => ({ data: [{ id: 'r1', name: 'AUDITORIO' }, { id: 'r2', name: 'SALA 1' }], isLoading: false }),
}))
vi.mock('@/hooks/useRoomBookings', () => ({
  useRoomBookings: () => ({ data: [reserva], isFetching: false, isLoading: false, isError: false }),
  useCreateRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/PersonPicker', () => ({
  PersonPicker: () => <input aria-label="Buscar pessoa" />,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { DayAgendaPanel } = await import('@/components/agenda/DayAgendaPanel')

const curso = {
  id: 'c1', title: 'MANEJO DE PASTAGEM', startTime: '08:00', endTime: '12:00',
  location: 'AUDITORIO', instructorName: 'MARIA', startDate: '2026-09-17', endDate: null,
}
const evento = {
  kind: 'EVENT' as const, id: 'b2', title: 'DIA DE CAMPO', roomName: 'SALA APL',
  startTime: '2026-09-17T18:00:00.000Z', endTime: '2026-09-17T21:00:00.000Z', publicOnSite: true,
}
const reuniao = {
  kind: 'MEETING' as const, id: 'b1', title: 'REUNIAO DA DIRETORIA', roomName: 'SALA 1',
  startTime: '2026-09-17T14:00:00.000Z', endTime: '2026-09-17T16:00:00.000Z', publicOnSite: false,
}

function renderPanel(props: Partial<Parameters<typeof DayAgendaPanel>[0]> = {}) {
  const onOpenCourse = vi.fn()
  render(
    <DayAgendaPanel
      date="2026-09-17"
      courses={[curso]}
      bookings={[reuniao, evento]}
      onOpenCourse={onOpenCourse}
      {...props}
    />,
  )
  return { onOpenCourse }
}

const byId = (id: string) => document.getElementById(id) as HTMLInputElement

describe('DayAgendaPanel', () => {
  it('lista o dia com horário, sala, tipo e o selo "No site"', () => {
    renderPanel()
    expect(screen.getByText('MANEJO DE PASTAGEM')).toBeInTheDocument()
    expect(screen.getByText('08:00 – 12:00')).toBeInTheDocument()
    expect(screen.getByText('14:00–16:00')).toBeInTheDocument()
    expect(screen.getByText('SALA APL')).toBeInTheDocument()
    expect(screen.getByText('Curso')).toBeInTheDocument()
    expect(screen.getByText('Evento')).toBeInTheDocument()
    expect(screen.getByText('Reunião')).toBeInTheDocument()
    expect(screen.getByText('No site')).toBeInTheDocument()
    expect(screen.getByText('1 curso · 2 reservas')).toBeInTheDocument()
  })

  it('sem nada marcado mostra o vazio', () => {
    renderPanel({ courses: [], bookings: [] })
    expect(screen.getByText('Nada marcado neste dia.')).toBeInTheDocument()
  })

  it('"Nova reserva" abre o diálogo já no dia selecionado', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }))
    expect(screen.getByRole('heading', { name: 'Nova reserva' })).toBeInTheDocument()
    expect(byId('booking-date').value).toBe('17/09/2026')
  })

  it('a nova reserva já vem com a sala do filtro', () => {
    renderPanel({ roomId: 'r2' })
    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }))
    expect(byId('booking-room').value).toBe('r2')
  })

  it('clicar num evento/reunião abre a edição da reserva', () => {
    renderPanel()
    fireEvent.click(screen.getByText('REUNIAO DA DIRETORIA'))
    expect(screen.getByRole('heading', { name: 'Editar reserva' })).toBeInTheDocument()
    expect(byId('booking-title').value).toBe('REUNIAO DA DIRETORIA')
    expect(byId('booking-start').value).toBe('14:00')
    expect(screen.getByRole('button', { name: /Excluir/ })).toBeInTheDocument()
  })

  it('curso continua abrindo a tela de cursos', () => {
    const { onOpenCourse } = renderPanel()
    fireEvent.click(screen.getByText('MANEJO DE PASTAGEM'))
    expect(onOpenCourse).toHaveBeenCalledWith('c1')
    expect(screen.queryByRole('heading', { name: 'Editar reserva' })).not.toBeInTheDocument()
  })

  it('tem o botão de exportar a planilha das reservas', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /Exportar/ })).toBeInTheDocument()
  })
})
