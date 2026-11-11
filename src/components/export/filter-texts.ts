// Como cada tela diz os filtros que mandam id ou código (SR-103), para a linha
// "Filtros:" do montador dizer o mesmo que a API escreve no PDF, sem id:
// "Caixa: BANCO", não "Caixa: 6f1c…". Vão no `filterTexts` do `ExportMenu`.
// O período (`from`/`to`) e os filtros de texto (busca, IP, forma de pagamento,
// tipo da Auditoria) o próprio montador já diz (`filtrosEmPalavras`), com os
// nomes do catálogo ("Forma de pagamento: PIX", "Tipo: Usuário", SR-107).

/** Os nomes da API para o tipo do lançamento e o da reserva. */
const TIPO_DO_LANCAMENTO: Record<string, string> = { IN: 'Entrada', OUT: 'Saída' }
const TIPO_DA_RESERVA: Record<string, string> = { EVENT: 'Evento', MEETING: 'Reunião' }

function juntar(partes: Record<string, string | null>): Record<string, string> {
  const textos: Record<string, string> = {}
  for (const [chave, texto] of Object.entries(partes)) if (texto) textos[chave] = texto
  return textos
}

/**
 * Filtro por id: "Caixa: BANCO". Se a tela não achou o nome (a lista não
 * carregou), só "Caixa": o id não diz nada a quem lê. Sem filtro, nada.
 */
function porNome(rotulo: string, id: string | null | undefined, nome: string | null | undefined): string | null {
  if (!id) return null
  return nome ? `${rotulo}: ${nome}` : rotulo
}

/** Lista fixa: "Tipo: Saída"; valor que a tela não conhece fica com o montador. */
function porLista(rotulo: string, valor: string | null | undefined, nomes: Record<string, string>): string | null {
  return valor && nomes[valor] ? `${rotulo}: ${nomes[valor]}` : null
}

/**
 * Financeiro › Lançamentos: o tipo como a API diz ("Tipo: Saída"), a categoria
 * e o caixa pelo nome e a ordem por Nº ("Ordem: Nº"; a por data, a de sempre,
 * não aparece).
 */
export function textosDoFinanceiro({ type, categoryId, categoria, accountId, caixa, orderBy }: {
  type?: string | null
  categoryId?: string | null
  /** Nome da categoria do filtro, se a tela souber. */
  categoria?: string | null
  accountId?: string | null
  /** Nome do caixa do filtro, se a tela souber. */
  caixa?: string | null
  orderBy?: string | null
}): Record<string, string> {
  return juntar({
    type: porLista('Tipo', type, TIPO_DO_LANCAMENTO),
    categoryId: porNome('Categoria', categoryId, categoria),
    accountId: porNome('Caixa', accountId, caixa),
    orderBy: orderBy === 'number' ? 'Ordem: Nº' : null,
  })
}

/**
 * Auditoria: a ação com o nome do filtro da tela ("Ação: Exportações") e quem
 * pelo usuário ("Quem: bali"). O tipo (`entity`) já é o nome ("Tipo: Usuário").
 */
export function textosDaAuditoria({ action, acoes, actorId, quem }: {
  action?: string | null
  /** Os nomes do filtro "Ação" da tela ({ export: 'Exportações' }). */
  acoes: Record<string, string>
  actorId?: string | null
  /** Usuário de quem fez, se a tela souber. */
  quem?: string | null
}): Record<string, string> {
  return juntar({
    action: porLista('Ação', action, acoes),
    actorId: porNome('Quem', actorId, quem),
  })
}

/** Agenda das salas: a sala pelo nome ("Sala: AUDITORIO") e o tipo ("Tipo: Reunião"). */
export function textosDaAgenda({ roomId, sala, type }: {
  roomId?: string | null
  /** Nome da sala do filtro, se a tela souber. */
  sala?: string | null
  type?: string | null
}): Record<string, string> {
  return juntar({
    roomId: porNome('Sala', roomId, sala),
    type: porLista('Tipo', type, TIPO_DA_RESERVA),
  })
}
