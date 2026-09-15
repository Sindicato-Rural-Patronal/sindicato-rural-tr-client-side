// Coluna de "Ações" presa à direita do scroll horizontal das tabelas do admin.
//
// Problema: a sidebar ocupa 256px, então a largura útil é `janela - 256 - 48`.
// As tabelas passam disso em telas estreitas (e em desktop com zoom alto, que
// reduz a largura efetiva), transbordam e empurram os botões de Editar/Excluir
// pra fora da área visível — quem não percebe a barra de rolagem horizontal
// simplesmente não encontra os botões.
//
// Solução: a célula de Ações fica `sticky right-0` e o conteúdo passa por baixo
// dela. Como precisa de fundo opaco pra esconder o que passa atrás, o
// `hover:bg-muted/50` que o TableRow pinta não a alcança; o `color-mix`
// reproduz exatamente o tom que aquele hover produz sobre o card, senão a
// célula fica branca e destoa do resto da linha.
//
// Uso:
//   <TableRow className={STICKY_ACTIONS_ROW}>
//     ...
//     <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>…</TableCell>
//
// O mesmo `STICKY_ACTIONS_CELL` vale para o <TableHead> de Ações (lá o hover
// não se aplica, já que o cabeçalho não tem a classe de grupo).

/** Vai na <TableRow> das linhas de dados, pra célula presa acompanhar o hover. */
export const STICKY_ACTIONS_ROW = 'group/row'

/** Vai no <TableHead> e no <TableCell> da coluna de Ações. */
export const STICKY_ACTIONS_CELL =
  'sticky right-0 z-10 bg-card group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]'
