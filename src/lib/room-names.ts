// Salas do sindicato: lista fixa (o backend recusa nome fora dela).
export const ROOM_NAMES = [
  'AUDITORIO',
  'COZINHA',
  'SALA DE VIDEO CONFERENCIA',
  'SALA 1',
  'SALA 2',
  'SALA APL',
] as const

type RoomNameOption = { value: string; label: string; disabled: boolean }

/**
 * Opções do select de nome: as salas da lista, com as já cadastradas
 * desabilitadas (menos a que está sendo editada) e, se o nome atual for antigo,
 * fora da lista, ele também.
 */
export function roomNameOptions(usedNames: string[], current = ''): RoomNameOption[] {
  const options: RoomNameOption[] = ROOM_NAMES.map(name => {
    const taken = usedNames.includes(name) && name !== current
    return { value: name, label: taken ? `${name} (já cadastrada)` : name, disabled: taken }
  })
  if (current && !(ROOM_NAMES as readonly string[]).includes(current)) {
    options.push({ value: current, label: `${current} (nome antigo)`, disabled: false })
  }
  return options
}
