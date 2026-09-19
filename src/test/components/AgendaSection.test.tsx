import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import type { RoomBooking, RoomBookingFilters, RoomScheduleItem } from '@/hooks/useRoomBookings'

// Agenda das salas do Painel Geral: visão dia/semana, busca, exportar, imprimir
// e faixa de ocupação. As chamadas à API ficam simuladas.

const spies = vi.hoisted(() => ({
  bookingFilters: [] as RoomBookingFilters[],
  scheduleFilters: [] as { from: string; to: string; roomId?: string }[],
}))

const reuniao: RoomBooking = {
  id: 'b1', type: 'MEETING', title: 'REUNIAO DA DIRETORIA', description: null,
  publicOnSite: false, publicDescription: null, roomId: 'r2', roomName: 'SALA 1',
  startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T16:00:00.000Z',
  responsible: { id: 'p1', name: 'MARIA' }, responsibleName: null, seriesId: null,
}
const eventoNaQuarta: RoomBooking = {
  ...reuniao, id: 'b2', type: 'EVENT', title: 'DIA DE CAMPO', roomId: 'r1', roomName: 'AUDITORIO',
  publicOnSite: true, responsible: null, responsibleName: 'JOAO',
  startTime: '2026-10-07T18:00:00.000Z', endTime: '2026-10-07T21:00:00.000Z',
}
const curso: RoomScheduleItem = {
  kind: 'COURSE', id: 'c1', title: 'MANEJO DE PASTAGEM', roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  status: 'PUBLIC', seriesId: null, publicOnSite: false,
}

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, cannot: () => false, isLoading: false, perms: [] }),
}))
vi.mock('@/hooks/useRooms', () => ({
  // SALA 2 fica sem nada marcado: é a sala "livre o dia todo" da ocupação.
  useRooms: () => ({
    data: [{ id: 'r1', name: 'AUDITORIO' }, { id: 'r2', name: 'SALA 1' }, { id: 'r3', name: 'SALA 2' }],
    isLoading: false,
  }),
}))
vi.mock('@/hooks/useRoomBookings', () => ({
  useRoomBookings: (filters: RoomBookingFilters) => {
    spies.bookingFilters.push(filters)
    const data = [reuniao, eventoNaQuarta].filter(b =>
      !filters.search || b.title.includes(filters.search) || (b.responsibleName ?? b.responsible?.name ?? '').includes(filters.search))
    return { data, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }
  },
  useRoomSchedule: (filters: { from: string; to: string; roomId?: string }) => {
    spies.scheduleFilters.push(filters)
    return { data: [curso], isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }
  },
  useCreateRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRoomBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
// jsdom não tem matchMedia; no teste a tela é sempre "computador".
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/PersonPicker', () => ({ PersonPicker: () => <input aria-label="Buscar pessoa" /> }))
vi.mock('@/lib/export', () => ({ downloadExport: vi.fn().mockResolvedValue(2) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { AgendaSection } = await import('@/components/agenda/AgendaSection')

function renderSection(props: Partial<Parameters<typeof AgendaSection>[0]> = {}) {
  const onOpenCourse = vi.fn()
  const onChangeDia = vi.fn()
  render(<AgendaSection dia="2026-10-05" onOpenCourse={onOpenCourse} onChangeDia={onChangeDia} {...props} />)
  return { onOpenCourse, onChangeDia }
}

const byId = (id: string) => document.getElementById(id) as HTMLInputElement
/** Só a lista de cartões (o título também aparece na faixa de ocupação). */
const naLista = () => within(screen.getAllByRole('list')[0])

beforeEach(() => {
  spies.bookingFilters.length = 0
  spies.scheduleFilters.length = 0
})
afterEach(() => { vi.useRealTimers() })

describe('AgendaSection', () => {
  it('lista o dia com horário, sala, tipo, responsável e o selo "No site"', () => {
    renderSection()
    expect(screen.getByText('Segunda-feira, 05/10/2026')).toBeInTheDocument()
    expect(naLista().getByText('MANEJO DE PASTAGEM')).toBeInTheDocument()
    expect(screen.getByText('08:00–12:00')).toBeInTheDocument()
    expect(screen.getByText('14:00–16:00')).toBeInTheDocument()
    expect(screen.getByText('Responsável: MARIA')).toBeInTheDocument()
    expect(screen.getByText('1 curso · 1 reserva')).toBeInTheDocument()
    // O evento de quarta veio na busca da semana, mas não é deste dia.
    expect(screen.queryByText('DIA DE CAMPO')).not.toBeInTheDocument()
  })

  it('busca o período inteiro numa vez só (dia, e semana ao trocar a visão)', () => {
    renderSection()
    expect(spies.bookingFilters[0]).toMatchObject({ from: '2026-10-05', to: '2026-10-05' })
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(spies.bookingFilters.at(-1)).toMatchObject({ from: '2026-10-05', to: '2026-10-11' })
    expect(spies.scheduleFilters.at(-1)).toMatchObject({ from: '2026-10-05', to: '2026-10-11' })
  })

  it('a visão da semana mostra os sete dias e os itens de cada um', () => {
    renderSection()
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByText('Semana de 05/10/2026 a 11/10/2026')).toBeInTheDocument()
    expect(screen.getByText('DIA DE CAMPO')).toBeInTheDocument()
    expect(screen.getByText('REUNIAO DA DIRETORIA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Domingo\s*11\/10/ })).toBeInTheDocument()
  })

  it('escolher um dia da semana passa o foco para ele e volta para a visão do dia', () => {
    const { onChangeDia } = renderSection()
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    fireEvent.click(screen.getByRole('button', { name: /Quarta\s*07\/10/ }))
    expect(onChangeDia).toHaveBeenCalledWith('2026-10-07')
    expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicar num item da semana abre a mesma coisa da visão do dia', () => {
    renderSection()
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    fireEvent.click(screen.getByText('DIA DE CAMPO'))
    expect(screen.getByRole('heading', { name: 'Editar reserva' })).toBeInTheDocument()
    expect(byId('booking-title').value).toBe('DIA DE CAMPO')
  })

  it('a busca só vale para reservas, e avisa disso', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderSection()
    fireEvent.change(screen.getByLabelText('Buscar reserva por título ou responsável'), { target: { value: 'CAMPO' } })
    act(() => { vi.advanceTimersByTime(400) })
    expect(spies.bookingFilters.at(-1)?.search).toBe('CAMPO')
    expect(screen.getByText(/Cursos não entram na busca/)).toBeInTheDocument()
    // Curso sai da lista enquanto a busca está ligada.
    expect(screen.queryByText('MANEJO DE PASTAGEM')).not.toBeInTheDocument()
  })

  it('busca sem resultado mostra o termo digitado', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderSection()
    fireEvent.change(screen.getByLabelText('Buscar reserva por título ou responsável'), { target: { value: 'NAO EXISTE' } })
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByText('Nada encontrado para “NAO EXISTE”.')).toBeInTheDocument()
    // O botão do estado vazio (o outro "Limpar busca" é o X do campo).
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpar busca' }).at(-1)!)
    act(() => { vi.advanceTimersByTime(400) })
    expect(naLista().getByText('MANEJO DE PASTAGEM')).toBeInTheDocument()
  })

  it('"Nova reserva" abre o diálogo já no dia selecionado', () => {
    renderSection()
    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }))
    expect(screen.getByRole('heading', { name: 'Nova reserva' })).toBeInTheDocument()
    expect(byId('booking-date').value).toBe('05/10/2026')
  })

  it('curso continua abrindo a tela de cursos', () => {
    const { onOpenCourse } = renderSection()
    fireEvent.click(naLista().getByText('MANEJO DE PASTAGEM'))
    expect(onOpenCourse).toHaveBeenCalledWith('c1')
    expect(screen.queryByRole('heading', { name: 'Editar reserva' })).not.toBeInTheDocument()
  })

  it('tem exportar e imprimir', () => {
    renderSection()
    expect(screen.getByRole('button', { name: /Exportar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeInTheDocument()
  })

  it('a ocupação abre com uma linha por sala e marca o horário no clique', () => {
    renderSection()
    const faixa = screen.getByRole('button', { name: /Ocupação das salas/ })
    expect(faixa).toHaveAttribute('aria-expanded', 'true')
    const ocupado = screen.getByRole('button', { name: 'Marcar reserva na sala SALA 1 neste dia' })
    expect(screen.getByRole('button', { name: 'Marcar reserva na sala AUDITORIO neste dia' })).toBeInTheDocument()
    fireEvent.click(ocupado, { clientX: 0 })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Nova reserva' })).toBeInTheDocument()
    expect(byId('booking-room').value).toBe('r2')
    // Sem largura no jsdom o clique cai no começo da faixa (07:00).
    expect(byId('booking-start').value).toBe('07:00')
    expect(byId('booking-end').value).toBe('08:00')
  })

  it('a ocupação diz o horário por escrito e avisa qual sala está livre', () => {
    renderSection()
    // O horário vem escrito (lista do celular e barra do gráfico), não só na
    // posição da barra. O leitor de tela ouve sala, tipo, título e horário.
    expect(screen.getAllByRole('button', { name: 'AUDITORIO: Curso MANEJO DE PASTAGEM, 08:00 às 12:00' }).length)
      .toBeGreaterThan(0)
    expect(screen.getAllByText('14:00 às 16:00').length).toBeGreaterThan(0)
    // Sala sem nada marcado diz que está livre, por escrito.
    expect(screen.getAllByText('Livre o dia todo').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Sala SALA 2 livre o dia todo. Clique para marcar uma reserva.' }))
      .toBeInTheDocument()
  })
})
