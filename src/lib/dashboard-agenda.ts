// Calendário do painel: cursos + reservas de sala (eventos e reuniões) da agenda.
// Funções puras sobre datas "YYYY-MM-DD" e horários "de parede" (ver lib/agenda.ts).
import { isValidYmd, occupiedDays, type ScheduleKind } from '@/lib/agenda'

/** Filtro de tipo dos chips do painel. */
export type DashboardTypeFilter = 'all' | ScheduleKind

/** Parâmetros da agenda na URL do painel. */
export type DashboardSearch = {
  /** Dia selecionado no calendário ("YYYY-MM-DD"); vazio = hoje. */
  dia?: string
  /** Sala do filtro (id); vazio = todas. */
  sala?: string
  /** Tipo do filtro; vazio = todos. */
  tipo?: ScheduleKind
  /**
   * Atalho "Nova reserva" do topo do painel: `?nova=reserva` pede à agenda que
   * abra o formulário de reserva já no dia selecionado. O painel rola até a
   * agenda e repassa isto à `AgendaSection`, que abre o formulário e manda
   * tirar o parâmetro da URL (senão o formulário reabriria ao voltar aqui).
   */
  nova?: 'reserva'
}

const KINDS: ScheduleKind[] = ['COURSE', 'EVENT', 'MEETING']

/** Lê `?dia=&sala=&tipo=&nova=` do painel, jogando fora o que não serve. */
export function parseDashboardSearch(s: Record<string, unknown>): DashboardSearch {
  const sala = typeof s.sala === 'number' ? String(s.sala) : s.sala
  return {
    dia: isValidYmd(s.dia) ? s.dia : undefined,
    sala: typeof sala === 'string' && sala ? sala : undefined,
    tipo: KINDS.includes(s.tipo as ScheduleKind) ? (s.tipo as ScheduleKind) : undefined,
    nova: s.nova === 'reserva' ? 'reserva' : undefined,
  }
}

/** O mínimo de um item de GET /admin/room-schedule usado pelo painel. */
export type ScheduleEntryLike = {
  kind: ScheduleKind
  startTime: string
  endTime: string
}

/**
 * Dias entre `from` e `to` (inclusive) ocupados por um tipo de item. Os cursos
 * do calendário vêm da mesma agenda das salas (GET /admin/room-schedule) — o
 * painel não pagina mais a lista de cursos só para pintar as bolinhas —, e a
 * regra do dia ocupado é a `occupiedDays` de `lib/agenda`, a mesma que a lista
 * do dia usa: bolinha e lista nunca discordam.
 */
export function kindDays(items: ScheduleEntryLike[], from: string, to: string, kind: ScheduleKind): Set<string> {
  return occupiedDays(items.filter(item => item.kind === kind), from, to)
}
