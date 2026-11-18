import { fetchFinanceTransactionsForRange } from '@/hooks/useFinance'
import type { DadosEntidade } from '@/lib/relatorio-empenho-pdf'
import { receitasDoRelatorio } from '@/lib/relatorio-receitas'
import { periodoDoDocumento, registrarDocumento } from '@/lib/registrar-documento'

/**
 * "Relatório de receitas" da Visão geral (SR-140): busca os lançamentos do período, registra
 * na auditoria e só então desenha e baixa o PDF. Se o registro falhar, o PDF não é gerado
 * (o erro sobe para a tela). A lib de PDF só carrega aqui, no clique.
 */
export async function gerarRelatorioReceitas(
  range: { from: string; to: string },
  entidade: DadosEntidade,
): Promise<void> {
  const [{ downloadRelatorioReceitasPdf }, txns] = await Promise.all([
    import('@/lib/relatorio-receitas-pdf'),
    fetchFinanceTransactionsForRange(range),
  ])
  await registrarDocumento('relatorio-receitas', {
    linhas: receitasDoRelatorio(txns).length,
    alvo: periodoDoDocumento(range.from, range.to),
    escopo: 'com filtros',
  })
  await downloadRelatorioReceitasPdf(txns, entidade, range)
}
