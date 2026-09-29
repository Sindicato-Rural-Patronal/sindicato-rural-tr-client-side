import { apiErrorMessage } from '@/lib/api-error-message'

// A conta por trás do "Excluir selecionados": apagar em lotes e contar o que
// deu certo. Fica fora do componente porque é o pedaço que precisa de teste —
// falha no meio da lista é o caso que importa.

/** Quantos vão de uma vez. Acima disto o banco leva pancada e a tela trava. */
const LOTE = 5

export async function apagarEmLotes(
  ids: readonly string[],
  apagar: (id: string) => Promise<unknown>,
): Promise<{ ok: number; erros: string[] }> {
  let ok = 0
  const erros: string[] = []

  for (let i = 0; i < ids.length; i += LOTE) {
    const resultados = await Promise.allSettled(ids.slice(i, i + LOTE).map(apagar))
    for (const r of resultados) {
      if (r.status === 'fulfilled') ok++
      // A primeira mensagem de erro basta: dez falhas iguais dizem o mesmo.
      else if (erros.length < 1) erros.push(apiErrorMessage(r.reason, 'erro ao excluir'))
    }
  }
  return { ok, erros }
}

