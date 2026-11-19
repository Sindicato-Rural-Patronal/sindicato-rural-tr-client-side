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
// A borda da célula presa (`STICKY_EDGE`) avisa que há colunas passando por
// baixo dela: uma linha de 1 px na cor da borda e, à esquerda, um degradê de
// 10 px na cor do texto (escuro no tema claro, claro no escuro). Não dá para
// fazer isso com `box-shadow` de fora: a tabela tem bordas coladas
// (`border-collapse`, do preflight) e, nesse modelo, o navegador não pinta a
// sombra de fora de uma célula (a spec do CSS diz que ela não tem efeito ali).
// Por isso a linha é uma sombra `inset`, que fica dentro da célula e aparece, e
// o degradê é um `::before` posicionado à esquerda da célula (`right-full`),
// por cima das colunas que rolam; `pointer-events-none` deixa clicar no que está
// embaixo. A célula não pode ter `overflow-hidden`, senão corta o `::before`.
// Só tokens do tema (`--border`, `--foreground`): funciona nos dois temas.
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

/** A célula presa à direita, sem a borda: fundo opaco e o mesmo hover da linha. */
export const STICKY_CELL =
  'sticky right-0 z-10 bg-card group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]'

/**
 * A borda esquerda da célula presa, em qualquer largura: linha `inset` de 1 px e o
 * degradê de 10 px no `::before` (ver o comentário do topo). Quem sabe quando a
 * tabela rola (a das visões) põe esta classe só enquanto rola.
 */
export const STICKY_EDGE =
  'shadow-[inset_1px_0_0_var(--border)] '
  + 'before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-2.5 '
  + 'before:bg-linear-to-l before:from-[color-mix(in_srgb,var(--foreground)_16%,transparent)] before:to-transparent'

/**
 * Vai no <TableHead> e no <TableCell> da coluna de Ações. A borda (`STICKY_EDGE`,
 * repetida aqui com `max-lg:`) só aparece abaixo de lg, onde a tabela costuma
 * passar da tela; as classes ficam escritas por extenso para o Tailwind achá-las.
 */
export const STICKY_ACTIONS_CELL =
  `${STICKY_CELL} `
  + 'max-lg:shadow-[inset_1px_0_0_var(--border)] '
  + 'max-lg:before:pointer-events-none max-lg:before:absolute max-lg:before:inset-y-0 max-lg:before:right-full max-lg:before:w-2.5 '
  + 'max-lg:before:bg-linear-to-l max-lg:before:from-[color-mix(in_srgb,var(--foreground)_16%,transparent)] max-lg:before:to-transparent'
