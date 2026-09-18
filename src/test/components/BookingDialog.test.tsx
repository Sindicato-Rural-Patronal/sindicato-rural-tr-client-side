import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { RoomBooking } from '@/hooks/useRoomBookings'
import { ApiError } from '@/lib/api'

// Hooks simulados: o teste cobre só o formulário.
const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/hooks/useRooms', () => ({
  useRooms: () => ({ data: [{ id: 'r1', name: 'AUDITORIO' }, { id: 'r2', name: 'SALA 1' }], isLoading: false }),
}))
vi.mock('@/hooks/useRoomBookings', () => ({
  useCreateRoomBooking: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateRoomBooking: () => ({ mutateAsync: updateMock, isPending: false }),
  useDeleteRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/PersonPicker', () => ({
  PersonPicker: () => <input aria-label="Buscar pessoa" />,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { BookingDialog } = await import('@/components/agenda/BookingDialog')

const byId = (id: string) => document.getElementById(id) as HTMLInputElement

function fillValid() {
  fireEvent.change(byId('booking-title'), { target: { value: 'Reunião da diretoria' } })
  fireEvent.change(byId('booking-room'), { target: { value: 'r2' } })
  fireEvent.change(byId('booking-date'), { target: { value: '05102026' } })
  fireEvent.change(byId('booking-start'), { target: { value: '08:00' } })
  fireEvent.change(byId('booking-end'), { target: { value: '12:00' } })
}

beforeEach(() => {
  createMock.mockReset()
  updateMock.mockReset()
})

describe('BookingDialog', () => {
  it('nova reserva: mostra os erros dos obrigatórios e não envia', () => {
    render(<BookingDialog open booking={null} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Nova reserva' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }))
    expect(screen.getByText('Informe o título.')).toBeInTheDocument()
    expect(screen.getByText('Escolha a sala.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('término antes do início aparece no campo', () => {
    render(<BookingDialog open booking={null} onClose={() => {}} />)
    fillValid()
    fireEvent.change(byId('booking-end'), { target: { value: '07:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }))
    expect(screen.getByText('O término precisa ser depois do início.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('envia o horário de parede e fecha', async () => {
    const onClose = vi.fn()
    createMock.mockResolvedValue({ ids: ['b1'], seriesId: null })
    render(<BookingDialog open booking={null} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reunião' }))
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(createMock).toHaveBeenCalledWith({
      type: 'MEETING',
      title: 'REUNIAO DA DIRETORIA',
      roomId: 'r2',
      startTime: '2026-10-05T08:00:00.000Z',
      endTime: '2026-10-05T12:00:00.000Z',
    })
  })

  it('evento marcado "Mostrar no site" vai publicado, com o texto público', async () => {
    const onClose = vi.fn()
    createMock.mockResolvedValue({ ids: ['b1'], seriesId: null })
    render(<BookingDialog open booking={null} onClose={onClose} />)
    fillValid()
    fireEvent.click(screen.getByRole('switch', { name: /Mostrar no site/ }))
    fireEvent.change(byId('booking-public-description'), { target: { value: 'Aberto ao público' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EVENT',
      publicOnSite: true,
      publicDescription: 'Aberto ao público',
    }))
  })

  it('reunião não tem a opção de mostrar no site', () => {
    render(<BookingDialog open booking={null} onClose={() => {}} />)
    expect(screen.getByRole('switch', { name: /Mostrar no site/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reunião' }))
    expect(screen.queryByRole('switch', { name: /Mostrar no site/ })).not.toBeInTheDocument()
  })

  it('sala ocupada (409): a mensagem do servidor fica no diálogo', async () => {
    const onClose = vi.fn()
    createMock.mockRejectedValue(new ApiError(409, 'Sala ocupada: Curso "X" em 05/10 08:00–12:00'))
    render(<BookingDialog open booking={null} onClose={onClose} />)
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }))
    expect(await screen.findByText('Sala ocupada: Curso "X" em 05/10 08:00–12:00')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('editar: carrega a reserva e avisa quando faz parte de uma repetição', () => {
    const booking: RoomBooking = {
      id: 'b9', type: 'EVENT', title: 'DIA DE CAMPO', description: 'Levar cadeiras',
      publicOnSite: false, publicDescription: null, roomId: 'r1', roomName: 'AUDITORIO',
      startTime: '2026-10-07T13:30:00.000Z', endTime: '2026-10-07T17:00:00.000Z',
      responsible: { id: 'p1', name: 'MARIA SILVA' }, responsibleName: null, seriesId: 's1',
    }
    render(<BookingDialog open booking={booking} canUpdate canDelete onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Editar reserva' })).toBeInTheDocument()
    expect(byId('booking-title').value).toBe('DIA DE CAMPO')
    expect(byId('booking-date').value).toBe('07/10/2026')
    expect(byId('booking-start').value).toBe('13:30')
    expect(screen.getByText('MARIA SILVA')).toBeInTheDocument()
    expect(screen.getByText(/faz parte de uma repetição/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Repetir' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Excluir/ })).toBeInTheDocument()
  })
})
