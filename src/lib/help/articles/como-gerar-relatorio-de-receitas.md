---
titulo: Como gerar o relatório de receitas para a contabilidade
resumo: Tirar as entradas de um período em Excel ou PDF, com os totais no fim, para mandar ao contador.
grupo: como-fazer
ordem: 15
permissao: READ_FINANCE
veja: financeiro, montar-relatorio, exportar-planilhas, como-registrar-lancamento
busca: receita receitas contabilidade contador contabil total totais entradas relatorio de receitas relatorio para a contabilidade exportar excel xlsx pdf modelo fabrica periodo mes financeiro lancamentos montar relatorio salvar como modelo cnpj cpf razao social
---

O contador pede, todo mês, o que o Sindicato recebeu. Este roteiro tira esse
relatório pronto: só as **entradas** do período, com o nome e o CNPJ ou CPF de
quem pagou e os **totais** no fim.

## Passo a passo

1. Abra **Financeiro** e vá na aba **Lançamentos**.
2. Em **De** e **Até**, ponha o período (o mês, por exemplo).
3. Em **Tipo**, escolha **Entradas**. Isso é importante: o modelo não filtra
   nada sozinho. Sem esse filtro, as saídas entram no arquivo.
4. Se quiser, filtre também por **Caixa** ou **Categoria**.
5. Clique em **Exportar** e depois em **Montar relatório…**.
6. Em **Modelo**, escolha **Contabilidade**. As colunas são Nº, Data, Nome /
   Razão social, CNPJ / CPF, Descrição, Categoria, Método e Valor (R$).
7. Em **Formato**, escolha **Planilha do Excel (.xlsx)** (ou **PDF**, para
   mandar ou imprimir).
8. Confira embaixo o filtro, que aparece escrito (por exemplo *Tipo:
   Entrada*), e clique no botão de baixar.

## Onde ficam os totais

Com a coluna **Valor (R$)** no relatório, o Excel e o PDF trazem, depois da
última linha, o **Total de entradas**. Se o arquivo tiver saídas, vem também o
**Total de saídas**.

- **No Excel**, os totais ficam depois dos dados (uma linha em branco e as
  linhas de total) e também na aba **Sobre**.
- **No PDF**, ficam na última página, embaixo da tabela.
- **Transferências entre caixas não entram nos totais**, nem os lançamentos
  marcados como só nota. Quando o arquivo tem transferência, aparece o aviso
  *Transferências entre caixas não entram nos totais.*
- **A planilha CSV não traz totais.** O **Excel (.xlsx)** do menu **Exportar**
  (sem montar) também não. Para ter os totais, passe sempre pelo **Montar
  relatório…**.

## Se você faz isso todo mês

Salve com um nome da sua equipe, como *Receitas para o contador*: clique em
**Salvar como modelo…**, escreva o nome e clique em **Salvar modelo**. O modelo
guarda as colunas e o formato, mas **não guarda o período nem o filtro Tipo**:
a cada mês, ponha **Entradas** e as datas antes de abrir o montador. Veja
[Modelos da equipe](?topico=montar-relatorio).

## Outro relatório: o PDF do período

Na aba **Visão geral**, o botão **Baixar PDF** tira o Relatório Financeiro do
período, com **Entradas por categoria** e **Saídas por categoria**. Serve para
mostrar de onde veio o dinheiro, sem listar lançamento por lançamento. Veja
[Financeiro](?topico=financeiro).

## Se algo não bate

| O que aparece | O que fazer |
|---|---|
| O arquivo tem saídas | Faltou o filtro **Tipo › Entradas**. Feche o montador, filtre e monte de novo |
| Não aparece o **Total de entradas** | A coluna **Valor (R$)** não está no relatório, ou o formato é CSV. Use o modelo **Contabilidade** em Excel ou PDF |
| Não vejo o modelo **Contabilidade** | Recarregue a página (F5) e abra o montador de novo |
| *O PDF aceita até 2.000 linhas.* | Escolha um período menor ou use o Excel |

Todo arquivo baixado fica na [Auditoria](?topico=auditoria). Ele leva CNPJ e
CPF de quem pagou: não mande por grupo de WhatsApp.
