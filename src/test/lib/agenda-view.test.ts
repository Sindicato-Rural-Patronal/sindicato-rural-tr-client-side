import { describe, it, expect } from 'vitest'
import {
  agendaCountLabel, agendaEntries, agendaFileName, hourAtFraction, itemsByDay, itemsOfDay,
  minutesToWall, occupancyLabelMinWidth, occupancyRows, occupancyTicks, occupancyTimeLabel,
  occupiedDays, plusOneHour, rangeLabel, startOfWeek, suggestedFreeHour, visibleRange,
  wallMinutes, weekDays,
  type AgendaEntry,
} from '@/lib/agenda'
import type { RoomBooking, RoomScheduleItem } from '@/hooks/useRoomBookings'

// Visões dia/semana, lista por dia e faixa de ocupação da agenda das salas.

const curso = (over: Partial<RoomScheduleItem> = {}): RoomScheduleItem => ({
  kind: 'COURSE', id: 'c1', title: 'MANEJO DE PASTAGEM', roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  status: 'PUBLIC', seriesId: null, publicOnSite: false, ...over,
})

const reserva = (over: Partial<RoomBooking> = {}): RoomBooking => ({
  id: 'b1', type: 'MEETING', title: 'REUNIAO DA DIRETORIA', description: null,
  publicOnSite: false, publicDescription: null, roomId: 'r2', roomName: 'SALA 1',
  startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T16:00:00.000Z',
  responsible: null, responsibleName: null, seriesId: null, ...over,
})

const salas = [{ id: 'r1', name: 'AUDITORIO' }, { id: 'r2', name: 'SALA 1' }]

const entry = (over: Partial<AgendaEntry>): AgendaEntry => ({
  key: over.key ?? `k-${over.id ?? '1'}`, kind: 'EVENT', id: '1', title: 'EVENTO',
  roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  publicOnSite: false, responsible: null, ...over,
})

describe('semana', () => {
  it('a semana vai de segunda a domingo', () => {
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05')
    // O domingo fecha a semana que começou na segunda anterior.
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
    expect(weekDays('2026-10-08')).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ])
  })

  it('o período visível é o dia ou a semana inteira', () => {
    expect(visibleRange('2026-10-07', 'day')).toEqual({ from: '2026-10-07', to: '2026-10-07' })
    expect(visibleRange('2026-10-07', 'week')).toEqual({ from: '2026-10-05', to: '2026-10-11' })
  })

  it('rótulo e nome do arquivo do período', () => {
    expect(rangeLabel('2026-10-05', '2026-10-05')).toBe('05/10/2026')
    expect(rangeLabel('2026-10-05', '2026-10-11')).toBe('05/10/2026 a 11/10/2026')
    expect(agendaFileName('2026-10-05', '2026-10-05')).toBe('agenda-2026-10-05')
    expect(agendaFileName('2026-10-05', '2026-10-11')).toBe('agenda-2026-10-05-a-2026-10-11')
  })

  it('conta cursos e reservas', () => {
    expect(agendaCountLabel(2, 1)).toBe('2 cursos · 1 reserva')
    expect(agendaCountLabel(0, 3)).toBe('3 reservas')
    expect(agendaCountLabel(0, 0)).toBeNull()
  })
})

describe('itens do dia', () => {
  it('junta cursos e reservas em ordem de horário', () => {
    const items = agendaEntries([curso()], [reserva(), reserva({ id: 'b2', type: 'EVENT', startTime: '2026-10-05T07:00:00.000Z', endTime: '2026-10-05T09:00:00.000Z', title: 'DIA DE CAMPO' })])
    expect(itemsOfDay(items, '2026-10-05').map(i => i.title)).toEqual([
      'DIA DE CAMPO', 'MANEJO DE PASTAGEM', 'REUNIAO DA DIRETORIA',
    ])
  })

  it('o responsável vem da pessoa do cadastro ou do nome digitado', () => {
    const [comPessoa, comNome] = agendaEntries([], [
      reserva({ id: 'b1', responsible: { id: 'p1', name: 'MARIA' } }),
      reserva({ id: 'b2', responsibleName: 'JOAO' }),
    ])
    expect(comPessoa.responsible).toBe('MARIA')
    expect(comNome.responsible).toBe('JOAO')
  })

  it('item de vários dias aparece em todos os dias, e o que começou antes vem primeiro', () => {
    const items = agendaEntries([curso({ startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-07T12:00:00.000Z' })], [reserva({ startTime: '2026-10-06T14:00:00.000Z', endTime: '2026-10-06T16:00:00.000Z' })])
    const dias = itemsByDay(items, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'])
    expect(dias.map(d => d.items.length)).toEqual([1, 2, 1, 0])
    expect(dias[1].items[0].title).toBe('MANEJO DE PASTAGEM')
  })

  it('terminar à meia-noite não ocupa o dia seguinte — curso e reserva pela mesma regra', () => {
    const items = agendaEntries(
      [curso({ startTime: '2026-10-05T20:00:00.000Z', endTime: '2026-10-06T00:00:00.000Z' })],
      [reserva({ startTime: '2026-10-05T20:00:00.000Z', endTime: '2026-10-06T00:00:00.000Z' })],
    )
    expect(itemsOfDay(items, '2026-10-05')).toHaveLength(2)
    expect(itemsOfDay(items, '2026-10-06')).toHaveLength(0)
    expect([...occupiedDays(items, '2026-10-01', '2026-10-31')]).toEqual(['2026-10-05'])
  })

  it('occupiedDays recorta o período pedido', () => {
    const items = agendaEntries([curso({ startTime: '2026-10-04T08:00:00.000Z', endTime: '2026-10-08T12:00:00.000Z' })], [])
    expect([...occupiedDays(items, '2026-10-05', '2026-10-06')]).toEqual(['2026-10-05', '2026-10-06'])
  })
})

describe('faixa de ocupação', () => {
  it('horas em minutos e de volta', () => {
    expect(wallMinutes('08:30')).toBe(510)
    expect(minutesToWall(510)).toBe('08:30')
    expect(plusOneHour('08:30')).toBe('09:30')
    expect(occupancyTicks()).toHaveLength(16)
  })

  it('a régua marca todas as horas e destaca de 3 em 3 (e o fim da faixa)', () => {
    const ticks = occupancyTicks()
    expect(ticks.filter(t => t.major).map(t => t.label)).toEqual([
      '07:00', '10:00', '13:00', '16:00', '19:00', '22:00',
    ])
    expect(ticks[1]).toMatchObject({ label: '08:00', major: false })
  })

  it('uma linha por sala, mesmo a sala vazia', () => {
    const rows = occupancyRows(agendaEntries([curso()], []), salas, '2026-10-05')
    expect(rows.map(r => r.roomName)).toEqual(['AUDITORIO', 'SALA 1'])
    expect(rows[1].blocks).toHaveLength(0)
    // Sala vazia também não tem nada escrito: é assim que a tela diz "livre".
    expect(rows[1].lines).toHaveLength(0)
  })

  it('o bloco mede o pedaço do dia dentro das 07:00–22:00 e traz o horário escrito', () => {
    const [aud] = occupancyRows(agendaEntries([curso()], []), salas, '2026-10-05')
    const bloco = aud.blocks[0]
    expect(bloco.left).toBeCloseTo((60 / 900) * 100, 5)
    expect(bloco.width).toBeCloseTo((240 / 900) * 100, 5)
    expect(bloco.cutBefore).toBe(false)
    expect(bloco.cutAfter).toBe(false)
    expect(bloco.time).toBe('08:00 às 12:00')
    expect(bloco.note).toBeNull()
    expect(bloco.label).toBe('08:00 às 12:00 · MANEJO DE PASTAGEM')
  })

  it('cada sala traz a lista escrita do dia, em ordem de horário', () => {
    const items = agendaEntries([curso()], [
      reserva({ id: 'b1', roomId: 'r1', roomName: 'AUDITORIO', startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T16:00:00.000Z' }),
      // Fora das 07:00–22:00: sai do gráfico, mas continua na lista escrita.
      reserva({ id: 'b2', roomId: 'r1', roomName: 'AUDITORIO', title: 'ENTREGA', startTime: '2026-10-05T05:00:00.000Z', endTime: '2026-10-05T06:30:00.000Z' }),
    ])
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.lines.map(l => `${l.time} ${l.title}`)).toEqual([
      '05:00 às 06:30 ENTREGA',
      '08:00 às 12:00 MANEJO DE PASTAGEM',
      '14:00 às 16:00 REUNIAO DA DIRETORIA',
    ])
    expect(aud.lines.map(l => l.outside)).toEqual([true, false, false])
    expect(aud.blocks).toHaveLength(2)
  })

  it('horário escrito de quem atravessa a virada do dia', () => {
    const noDia = { startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z' }
    expect(occupancyTimeLabel(noDia, '2026-10-05')).toEqual({ time: '08:00 às 12:00', note: null })

    const veioDeOntem = { startTime: '2026-10-04T20:00:00.000Z', endTime: '2026-10-05T10:00:00.000Z' }
    expect(occupancyTimeLabel(veioDeOntem, '2026-10-05')).toEqual({
      time: '04/10 20:00 às 05/10 10:00', note: 'Começou antes deste dia',
    })

    const vaiAteAmanha = { startTime: '2026-10-05T20:00:00.000Z', endTime: '2026-10-06T10:00:00.000Z' }
    expect(occupancyTimeLabel(vaiAteAmanha, '2026-10-05')).toEqual({
      time: '05/10 20:00 às 06/10 10:00', note: 'Termina em outro dia',
    })

    const diaInteiro = { startTime: '2026-10-04T20:00:00.000Z', endTime: '2026-10-06T10:00:00.000Z' }
    expect(occupancyTimeLabel(diaInteiro, '2026-10-05')).toEqual({
      time: '04/10 20:00 às 06/10 10:00', note: 'Ocupa o dia inteiro',
    })
  })

  it('o horário cabe dentro da barra larga e ao lado da barra estreita', () => {
    const items = [
      // 4 horas (26,7% da faixa): o horário cabe escrito dentro da barra.
      entry({ id: 'a', key: 'a', kind: 'COURSE', title: 'CURSO' }),
      // 1 hora (6,7%): não cabe dentro, e sobra faixa depois dela.
      entry({ id: 'b', key: 'b', roomId: 'r2', title: 'REUNIAO', startTime: '2026-10-05T09:00:00.000Z', endTime: '2026-10-05T10:00:00.000Z' }),
    ]
    const [aud, sala1] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].labelPlacement).toBe('inside')
    expect(sala1.blocks[0].labelPlacement).toBe('after')
    // O espaço do rótulo vai só até o fim da faixa (nada de estourar a borda).
    expect(sala1.blocks[0].labelSpace).toBeCloseTo(100 - (120 / 900) * 100 - (60 / 900) * 100, 5)
  })

  it('barra estreita colada no fim da faixa escreve o horário à esquerda', () => {
    const items = [entry({ id: 'f', key: 'f', title: 'FECHAMENTO', startTime: '2026-10-05T21:30:00.000Z', endTime: '2026-10-05T22:00:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].labelPlacement).toBe('before')
  })

  it('horário com data pede mais espaço que horário sem data', () => {
    // "08:00 às 12:00" cabe em 20% da faixa; "04/10 20:00 às 06/10 10:00", não.
    expect(occupancyLabelMinWidth('08:00 às 12:00'.length)).toBeLessThan(20)
    expect(occupancyLabelMinWidth('04/10 20:00 às 06/10 10:00'.length)).toBeGreaterThan(20)
  })

  it('dois vizinhos que precisam do mesmo vazio ficam com metade cada um', () => {
    // Um vem da véspera até as 10:00, o outro sai às 21:00 para o dia seguinte:
    // os dois têm barra curta e disputam o vazio do meio.
    const items = [
      entry({ id: 'v', key: 'v', title: 'VELORIO', startTime: '2026-10-04T20:00:00.000Z', endTime: '2026-10-05T10:00:00.000Z' }),
      entry({ id: 'p', key: 'p', title: 'PLANTAO', startTime: '2026-10-05T21:00:00.000Z', endTime: '2026-10-06T02:00:00.000Z' }),
    ]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks.map(b => b.labelPlacement)).toEqual(['after', 'before'])
    // O vazio entre as duas barras tem 73,33% e cada rótulo fica com metade —
    // um começa onde a barra acaba, o outro termina onde a outra começa.
    const vazio = aud.blocks[1].left - (aud.blocks[0].left + aud.blocks[0].width)
    expect(aud.blocks[0].labelSpace + aud.blocks[1].labelSpace).toBeCloseTo(vazio, 5)
  })

  it('sem espaço de nenhum lado, o horário sai da faixa e vai para o texto de baixo', () => {
    // Três reservas curtas grudadas: nenhuma tem 15% de folga ao lado.
    const items = [
      entry({ id: '1', key: '1', title: 'A', startTime: '2026-10-05T07:00:00.000Z', endTime: '2026-10-05T07:30:00.000Z' }),
      entry({ id: '2', key: '2', title: 'B', startTime: '2026-10-05T07:30:00.000Z', endTime: '2026-10-05T08:00:00.000Z' }),
      entry({ id: '3', key: '3', title: 'C', startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T08:30:00.000Z' }),
    ]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks.map(b => b.labelPlacement)).toEqual(['none', 'none', 'after'])
    // Quem ficou sem rótulo continua com o horário escrito para a tela mostrar.
    expect(aud.blocks[0].time).toBe('07:00 às 07:30')
  })

  it('itens que se sobrepõem ficam em linhas diferentes', () => {
    const items = [
      entry({ id: 'a', key: 'a', kind: 'COURSE', title: 'CURSO' }),
      entry({ id: 'b', key: 'b', title: 'EVENTO', startTime: '2026-10-05T10:00:00.000Z', endTime: '2026-10-05T11:00:00.000Z' }),
      entry({ id: 'c', key: 'c', title: 'DEPOIS', startTime: '2026-10-05T13:00:00.000Z', endTime: '2026-10-05T14:00:00.000Z' }),
    ]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.lanes).toBe(2)
    expect(aud.blocks.map(b => b.lane)).toEqual([0, 1, 0])
  })

  it('item de outro dia ocupa a faixa inteira, marcado dos dois lados', () => {
    const items = [entry({ id: 'm', key: 'm', startTime: '2026-10-04T20:00:00.000Z', endTime: '2026-10-06T10:00:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].left).toBe(0)
    expect(aud.blocks[0].width).toBe(100)
    expect(aud.blocks[0].cutBefore).toBe(true)
    expect(aud.blocks[0].cutAfter).toBe(true)
  })

  it('o que fica fora das 07:00–22:00 sai da faixa, mas continua contado', () => {
    const items = [entry({ id: 'x', key: 'x', startTime: '2026-10-05T05:00:00.000Z', endTime: '2026-10-05T06:30:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks).toHaveLength(0)
    expect(aud.outside).toHaveLength(1)
  })

  it('reserva curta ganha largura mínima para continuar visível', () => {
    const items = [entry({ id: 's', key: 's', startTime: '2026-10-05T09:00:00.000Z', endTime: '2026-10-05T09:10:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].width).toBe(2)
  })

  it('sala que não está na lista ainda aparece', () => {
    const items = [entry({ id: 'z', key: 'z', roomId: 'r9', roomName: 'SALA APL' })]
    const rows = occupancyRows(items, salas, '2026-10-05')
    expect(rows.map(r => r.roomName)).toEqual(['AUDITORIO', 'SALA 1', 'SALA APL'])
  })

  it('o botão da lista sugere o primeiro horário livre da sala', () => {
    const [aud, sala1] = occupancyRows(agendaEntries([curso()], []), salas, '2026-10-05')
    // AUDITORIO ocupado até as 12:00 → sugere 12:00; SALA 1 vazia → 07:00.
    expect(suggestedFreeHour(aud)).toBe('12:00')
    expect(suggestedFreeHour(sala1)).toBe('07:00')

    // Terminou 13:40 → arredonda para cima (14:00), nunca para trás.
    const [quebrado] = occupancyRows(
      [entry({ id: 'q', key: 'q', startTime: '2026-10-05T09:00:00.000Z', endTime: '2026-10-05T13:40:00.000Z' })],
      salas, '2026-10-05',
    )
    expect(suggestedFreeHour(quebrado)).toBe('14:00')

    // Ocupada até o fim da faixa: ainda sobra uma hora para a nova reserva.
    const [cheio] = occupancyRows(
      [entry({ id: 'c', key: 'c', startTime: '2026-10-05T09:00:00.000Z', endTime: '2026-10-05T22:00:00.000Z' })],
      salas, '2026-10-05',
    )
    expect(suggestedFreeHour(cheio)).toBe('21:00')
  })

  it('o clique na faixa vira horário de meia em meia hora', () => {
    expect(hourAtFraction(0)).toBe('07:00')
    expect(hourAtFraction(0.5)).toBe('14:30')
    expect(hourAtFraction(0.2)).toBe('10:00')
    // No fim da faixa sobra pelo menos uma hora para a reserva.
    expect(hourAtFraction(1)).toBe('21:00')
  })
})
