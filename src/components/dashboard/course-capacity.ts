// Lotação do curso no painel: "8/40", "quase lotado" e "lotado".

export type CapacityTone = 'ok' | 'almost' | 'full'

/**
 * Cheio (100%), quase cheio (80% ou mais) ou tranquilo.
 * Curso sem limite de vagas (`maxStudents` 0) nunca é "lotado".
 */
export function capacityTone(enrolled: number, maxStudents: number): CapacityTone {
  if (maxStudents <= 0) return 'ok'
  if (enrolled >= maxStudents) return 'full'
  return enrolled / maxStudents >= 0.8 ? 'almost' : 'ok'
}

/** "8/40", ou "8 inscritos" quando o curso não tem limite de vagas. */
export function capacityLabel(enrolled: number, maxStudents: number): string {
  return maxStudents > 0 ? `${enrolled}/${maxStudents}` : `${enrolled} inscrito${enrolled === 1 ? '' : 's'}`
}
