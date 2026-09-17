// Período dos banners da home. O dia escolhido vale no horário de Brasília
// (America/Sao_Paulo não tem horário de verão: sempre -03:00), qualquer que seja
// o fuso do computador de quem edita.

const BRASILIA_OFFSET = '-03:00'

/** "2026-09-20" → início do dia em Brasília ("2026-09-20T00:00:00.000-03:00"). */
export function bannerStartIso(ymd: string): string | null {
  return ymd ? `${ymd}T00:00:00.000${BRASILIA_OFFSET}` : null
}

/** "2026-09-30" → fim do dia em Brasília ("2026-09-30T23:59:59.999-03:00"). */
export function bannerEndIso(ymd: string): string | null {
  return ymd ? `${ymd}T23:59:59.999${BRASILIA_OFFSET}` : null
}

const brasiliaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Instante gravado → dia do calendário em Brasília ("YYYY-MM-DD"); vazio se não houver. */
export function brasiliaYmd(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // en-CA formata como AAAA-MM-DD
  return brasiliaDay.format(date)
}

/** "YYYY-MM-DD" → "DD/MM/AAAA". */
function br(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

/** Texto do período para a lista: "20/09/2026 a 30/09/2026", "A partir de …", "Até …" ou vazio. */
export function bannerPeriodLabel(banner: { startDate: string | null; endDate: string | null }): string {
  const start = brasiliaYmd(banner.startDate)
  const end = brasiliaYmd(banner.endDate)
  if (start && end) return `${br(start)} a ${br(end)}`
  if (start) return `A partir de ${br(start)}`
  if (end) return `Até ${br(end)}`
  return ''
}

export type BannerState = 'inactive' | 'scheduled' | 'live' | 'expired'

/**
 * Situação no site, com a mesma regra da listagem pública (GET /banners): ativo
 * e com início ≤ agora ≤ término (datas vazias não limitam).
 */
export function bannerState(
  banner: { active: boolean; startDate: string | null; endDate: string | null },
  now: Date = new Date(),
): BannerState {
  if (!banner.active) return 'inactive'
  const t = now.getTime()
  if (banner.startDate && new Date(banner.startDate).getTime() > t) return 'scheduled'
  if (banner.endDate && new Date(banner.endDate).getTime() < t) return 'expired'
  return 'live'
}

export const BANNER_STATE_LABEL: Record<BannerState, string> = {
  inactive: 'Inativo',
  scheduled: 'Agendado',
  live: 'No ar',
  expired: 'Expirado',
}
