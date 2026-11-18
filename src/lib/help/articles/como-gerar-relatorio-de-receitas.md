---
titulo: Como gerar o relatório de receitas para a contabilidade
resumo: Tirar as entradas de um período em Excel ou PDF, com os totais no fim, para mandar ao contador. Com imagens da tela, passo a passo.
grupo: como-fazer
ordem: 15
permissao: READ_FINANCE
veja: financeiro, montar-relatorio, exportar-planilhas, como-registrar-lancamento
busca: receita receitas contabilidade contador contabil total totais entradas relatorio de receitas relatorio para a contabilidade exportar excel xlsx pdf modelo fabrica periodo mes financeiro lancamentos montar relatorio salvar como modelo cnpj cpf razao social sem transferencias entre caixas imagens print tela passo a passo nota de empenho
---

O contador pede, todo mês, o que o Sindicato recebeu. Este roteiro tira esse
relatório pronto: só as **entradas** do período, com o nome e o CNPJ ou CPF de
quem pagou e os **totais** no fim. Cada passo tem a imagem da tela embaixo. Para
ver a imagem inteira, clique nela.

## Passo a passo

1. Abra **Financeiro** no menu e vá na aba **Lançamentos**.

   ![A tela Financeiro, aba Lançamentos, com a lista de lançamentos e os filtros em cima](/ajuda-imagens/receitas/01-lancamentos.png "A aba Lançamentos, com os filtros em cima da lista.")

2. Ponha os filtros, de cima para baixo:
   - em **De** e **Até**, o período (o mês, por exemplo);
   - em **Tipo**, escolha **Entradas**;
   - marque a caixa **Sem transferências entre caixas**.

   O filtro **Tipo** é importante: o modelo não filtra nada sozinho, e sem ele as
   saídas entram no arquivo. Se quiser, filtre também por **Caixa** ou
   **Categoria**. Os três quadros de cima (**Entradas**, **Saídas** e **Saldo**)
   mostram a soma do que ficou na lista: confira se a de **Entradas** é a que
   você espera.

   ![Os filtros De e Até com o período, Tipo em Entradas e a caixa Sem transferências entre caixas marcada, com os totais embaixo](/ajuda-imagens/receitas/02-filtros.png "Período, Tipo e a caixa marcados (o contorno é só para destacar).")

3. Clique em **Exportar** e, no fim do menu, em **Montar relatório…**.

   ![O menu Exportar aberto, com o item Montar relatório… no fim](/ajuda-imagens/receitas/03-exportar.png "O item Montar relatório… fica no fim do menu Exportar.")

4. Em **Modelo**, escolha **Contabilidade**. As 9 colunas aparecem à direita:
   Nº, Data, Tipo, Nome / Razão social, CNPJ / CPF, Descrição, Categoria,
   Método e Valor (R$). Embaixo, em **O que entra**, a linha **Filtros:** repete
   o que você pôs na tela: confira o período, o **Tipo: Entrada** e o **Sem
   transferências entre caixas**.

   ![O montador de relatórios com o modelo Contabilidade, as 9 colunas na ordem e a linha Filtros embaixo](/ajuda-imagens/receitas/04-modelo.png "O montador com o modelo Contabilidade e a linha Filtros.")

5. Em **Formato**, escolha **Planilha do Excel (.xlsx)** (ou **PDF**, para mandar
   ou imprimir). Depois clique no botão de baixar, no canto de baixo: o nome
   dele muda com o formato (**Baixar planilha do Excel**) e o número entre
   parênteses é a quantidade de lançamentos que vão no arquivo.

   ![O Formato com a Planilha do Excel marcada e o botão Baixar planilha do Excel no rodapé](/ajuda-imagens/receitas/05-formato.png "Excel marcado e o botão de baixar.")

## Como fica o arquivo

Com a coluna **Valor (R$)** no relatório, o Excel e o PDF trazem, depois da
última linha, o **Total de entradas**. Se o arquivo tiver saídas, vem também o
**Total de saídas**.

**No Excel**, o total fica depois dos dados (uma linha em branco e a linha de
total) e também na aba **Sobre**.

![O fim da planilha do Excel, com a linha Total de entradas destacada](/ajuda-imagens/receitas/06-excel-totais.png "O fim da planilha: o Total de entradas.")

**No PDF**, o total fica na última página, embaixo da tabela.

![O fim do PDF, com o quadro Total de entradas embaixo da tabela](/ajuda-imagens/receitas/07-pdf-totais.png "O fim do PDF: o Total de entradas.")

Com a caixa **Sem transferências entre caixas** marcada, as linhas do arquivo
somam exatamente o total, sem nenhuma nota. Os lançamentos marcados como **só
nota** também ficam fora dos totais.

**As colunas Nome / Razão social e CNPJ / CPF só vêm preenchidas quando o
lançamento tem a Nota de Empenho preenchida.** Sem ela, as duas ficam em branco
(foi o que aconteceu nas imagens acima, que usam dados de teste). Veja
[Financeiro](?topico=financeiro).

**A planilha CSV não traz totais.** O **Excel (.xlsx)** do menu **Exportar**
(sem montar) também não. Para ter os totais, passe sempre pelo **Montar
relatório…**.

## Se você faz isso todo mês

Salve com um nome da sua equipe, como *Receitas para o contador*: clique em
**Salvar como modelo…**, escreva o nome e clique em **Salvar modelo**.

![O montador com o painel Nome do modelo aberto, com o nome Receitas para o contador e o botão Salvar modelo](/ajuda-imagens/receitas/08-salvar-modelo.png "O painel Nome do modelo, com o botão Salvar modelo.")

O modelo guarda as colunas e o formato, mas **não guarda o período, o filtro
Tipo nem a caixa Sem transferências entre caixas**: a cada mês, ponha as datas,
**Entradas** e a caixa marcada antes de abrir o montador. Veja
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
| O arquivo traz a nota *Transferências entre caixas não entram nos totais.* | A caixa **Sem transferências entre caixas** estava desmarcada, então as transferências aparecem nas linhas e não entram no total. Marque a caixa, feche o montador e monte de novo: as linhas passam a somar o total e a nota some |
| Nome / Razão social e CNPJ / CPF em branco | O lançamento não tem a **Nota de Empenho** preenchida. Abra o lançamento, preencha a **Nota de Empenho** com o favorecido e o CNPJ ou CPF, e baixe de novo |
| Não aparece o **Total de entradas** | A coluna **Valor (R$)** não está no relatório, ou o formato é CSV. Use o modelo **Contabilidade** em Excel ou PDF |
| Não vejo o modelo **Contabilidade** | Recarregue a página (F5) e abra o montador de novo |
| *O PDF aceita até 2.000 linhas.* | Escolha um período menor ou use o Excel |

Todo arquivo baixado fica na [Auditoria](?topico=auditoria). Ele leva CNPJ e
CPF de quem pagou: não mande por grupo de WhatsApp.
