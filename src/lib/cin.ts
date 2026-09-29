// Carteira de Identidade Nacional (CIN), do Decreto 10.977/2022: a identidade
// nova não tem número próprio — o número dela É o CPF, igual em todo o país (o
// RG antigo era um por estado, e vale até 2032). Quem entrega a carteira nova
// no balcão não tem "RG" para ditar, e o atendente precisa saber que o número
// impresso ali é o que vai no campo do CPF. Daí o rótulo "CPF / CIN".
//
// Para o sistema não mudou nada: continua sendo o mesmo número de 11 dígitos,
// com a mesma conferência. O que muda é o que está escrito na tela.

/** Rótulo do campo onde se digita o número. */
export const CPF_LABEL = 'CPF / CIN'

/** Linha de apoio embaixo do campo, para quem está com a carteira na mão. */
export const CIN_HINT = 'Na identidade nova (CIN) o número é o próprio CPF — digite ele aqui.'
