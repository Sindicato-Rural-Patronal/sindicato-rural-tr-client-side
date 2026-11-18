---
titulo: Como gerar o relatório de receitas para a contabilidade
resumo: Tirar as entradas de um período em Excel ou PDF, com os totais no fim, para mandar ao contador. Com imagens da tela, passo a passo.
grupo: como-fazer
ordem: 15
permissao: READ_FINANCE
veja: financeiro, como-usar-visoes, exportar-planilhas, como-registrar-lancamento
busca: receita receitas contabilidade contador contabil total totais entradas relatorio de receitas botao relatorio de receitas visao geral relatorio para a contabilidade exportar exportar o que esta na tela excel xlsx pdf visao visao contabilidade de fabrica mes passado periodo mes financeiro lancamentos salvar como salvar visao visao da equipe cnpj cpf razao social sem transferencias entre caixas imagens print tela passo a passo nota de empenho montar relatorio alterada
---

O contador pede, todo mês, o que o Sindicato recebeu. Este roteiro tira esse
relatório pronto: só as **entradas** do período, com o nome e o CNPJ ou CPF de
quem pagou e os **totais** no fim. Cada passo tem a imagem da tela embaixo. Para
ver a imagem inteira, clique nela.

## O jeito mais rápido: Relatório de receitas

Na aba **Visão geral**, escolha o **Período** e
clique em **Relatório de receitas**. Sai um PDF pronto, com as entradas
separadas por categoria, o subtotal de cada uma e o **TOTAL GERAL** no fim.
Serve para a maioria dos meses. Se você prefere **Excel**, ou quer uma linha por
lançamento com o CNPJ / CPF, use o passo a passo abaixo, pela lista de
Lançamentos.

## Passo a passo (Excel ou PDF, pela lista)

**Antes de começar:** você precisa poder ver o Financeiro (a permissão
*Visualizar financeiro*).

1. Abra **Financeiro** no menu e vá na aba **Lançamentos**. Na barra entre os
   filtros e os totais, clique no seletor **Visão** e escolha **Contabilidade**,
   no grupo **De fábrica**.

   ![O seletor Visão aberto, com Contabilidade marcada no grupo De fábrica e a linha Liga: Tipo: Entrada · Sem transferências entre caixas · Período: mês passado](/ajuda-imagens/visoes/01-seletor-de-visoes.png "A visão Contabilidade, no seletor Visão.")

2. Confira a tela. A visão já ligou sozinha:
   - em **De** e **Até**, o **mês passado**;
   - em **Tipo**, **Entradas**;
   - a caixa **Sem transferências entre caixas**, marcada.

   A tabela passa a ter as 9 colunas do contador: Nº, Data, Tipo, Nome / Razão
   social, CNPJ / CPF, Descrição, Categoria, Método e Valor (R$). O quadro
   **Entradas** mostra a soma do que ficou na lista: confira se é o valor que
   você espera.

   Se as colunas não couberem na tela, a tabela rola de lado. O **Valor (R$)**
   fica preso à direita, sempre à vista.

   Precisa de outro mês? Mude **De** e **Até**. O nome da visão passa a
   **Contabilidade (alterada)**: é só um lembrete, e o arquivo sai do mesmo
   jeito. Se quiser, filtre também por **Caixa** ou **Categoria**.

   ![A visão Contabilidade aplicada: os filtros De e Até com outubro, Tipo em Entradas e Sem transferências entre caixas marcada, a barra da visão, os totais e a tabela com as 9 colunas, com o Valor (R$) e as Ações presos à direita](/ajuda-imagens/visoes/02-contabilidade-aplicada.jpg "O que a visão Contabilidade ligou na tela (o contorno é só para destacar).")

3. Clique em **Exportar**, no fim da barra. Confira o resumo: quantos
   lançamentos, **9 colunas** e **Visão: Contabilidade**. Embaixo, a linha dos
   **Filtros** repete o período, o **Tipo: Entrada** e o **Sem transferências
   entre caixas**.

   ![O Exportar o que está na tela aberto, com o resumo de 8 lançamentos, 9 colunas e a visão Contabilidade, a linha dos filtros, os botões Planilha CSV, Excel, PDF e Imprimir e o aviso do total de entradas](/ajuda-imagens/visoes/04-exportar.png "O Exportar, com o resumo e os quatro formatos.")

4. Clique em **Excel (.xlsx)** (ou em **PDF**, para mandar ou imprimir). Um
   clique já baixa. O arquivo vai para a pasta de downloads, e aparece *Planilha
   do Excel com 8 registros baixada.* (no PDF, *Relatório com 8 registros
   baixado.*). O número é quantos lançamentos foram.

   ![A planilha do Excel aberta, com as 9 colunas, as 8 entradas de outubro, uma linha em branco e o Total de entradas no fim](/ajuda-imagens/visoes/13-excel-lancamentos.png "A planilha do Excel, com o Total de entradas no fim.")

## Como fica o arquivo

Com a coluna **Valor (R$)**, o Excel e o PDF trazem, depois da última linha, o
**Total de entradas**. Se o arquivo tiver saídas, vem também o **Total de
saídas**.

**No Excel**, o total fica depois dos dados (uma linha em branco e a linha de
total) e também na aba **Sobre**. A aba **Sobre** diz também os filtros (com o
período) e a visão.

![A aba Sobre da planilha do Excel: Relatório, Gerado em, Registros, Total de entradas, Escopo, Filtros, Visão Contabilidade e Campos](/ajuda-imagens/visoes/14-excel-aba-sobre.png "A aba Sobre, com o total, os filtros e a visão.")

**No PDF**, a linha embaixo do título diz a visão e os filtros:

![O alto do PDF: o título Lançamentos e a linha Visão: Contabilidade · Filtros: Período: 01/10/2026 a 31/10/2026 · Tipo: Entrada · Sem transferências entre caixas](/ajuda-imagens/visoes/12a-pdf-cabecalho-visao.png "O alto do PDF, com a visão e os filtros.")

E o total fica na última página, embaixo da tabela:

![O fim do PDF: as últimas linhas da tabela e, embaixo, o Total de entradas de R$ 27.140,00](/ajuda-imagens/visoes/12b-pdf-total.png "O fim do PDF: o Total de entradas.")

Com a caixa **Sem transferências entre caixas** marcada, as linhas do arquivo
somam exatamente o total, sem nenhuma nota. Os lançamentos marcados como **só
nota** também ficam fora dos totais.

**As colunas Nome / Razão social e CNPJ / CPF só vêm preenchidas quando o
lançamento tem a Nota de Empenho preenchida.** Sem ela, as duas ficam em branco
(foi o que aconteceu em algumas linhas das imagens, que usam dados de teste).
Veja [Financeiro](?topico=financeiro).

**A planilha CSV não traz totais.** Para ter os totais, use o **Excel (.xlsx)**
ou o **PDF**.

## Se você faz isso todo mês

**Não precisa salvar nada.** A visão **Contabilidade** sempre abre no mês
passado, com os filtros certos. No começo de cada mês, é só escolher a visão e
exportar.

Se você mudou as colunas (pôs a **Nota fiscal**, por exemplo), salve a sua
versão para a equipe:

1. Clique em **Salvar como…**, na barra.
2. Em **Nome da visão**, escreva um nome, como *Receitas para o contador*.
3. Deixe marcado **Guardar os filtros ligados agora**.
4. Em **Período**, escolha **mês passado**.
5. Clique em **Salvar visão**.

![O painel Salvar como uma visão nova da equipe, com o nome, a caixa Guardar os filtros ligados agora marcada, o Período em mês passado e o botão Salvar visão](/ajuda-imagens/visoes/05-salvar-como.png "Salvar a sua versão como visão da equipe.")

A visão nova entra no grupo **Da equipe** do seletor, para todos. Ela guarda as
colunas, o **Tipo**, o **Sem transferências entre caixas** e o período
relativo: no mês seguinte, abre sozinha no mês certo. Veja
[Como usar as visões em Lançamentos](?topico=como-usar-visoes).

## Outro relatório: o PDF do período

Na aba **Visão geral**, além do **Relatório de receitas**, o botão **Baixar PDF** tira o Relatório Financeiro do
período, com **Entradas por categoria** e **Saídas por categoria**. Serve para
mostrar de onde veio o dinheiro, sem listar lançamento por lançamento. Veja
[Financeiro](?topico=financeiro).

## Se algo não bate

| O que aparece | O que fazer |
|---|---|
| O arquivo tem saídas | O **Tipo** não estava em **Entradas**: ele foi mudado depois de escolher a visão, e o nome mostra *(alterada)*. Escolha **Contabilidade** de novo no seletor e exporte de novo |
| O período não é o que eu queria | A visão põe o mês passado, contado a partir de hoje. Mude **De** e **Até** e exporte de novo |
| O arquivo traz a nota *Transferências entre caixas não entram nos totais.* | A caixa **Sem transferências entre caixas** estava desmarcada, então as transferências aparecem nas linhas e não entram no total. Marque a caixa e exporte de novo: as linhas passam a somar o total e a nota some |
| Nome / Razão social e CNPJ / CPF em branco | O lançamento não tem a **Nota de Empenho** preenchida. Abra o lançamento, preencha a **Nota de Empenho** com o favorecido e o CNPJ ou CPF, e exporte de novo |
| Não aparece o **Total de entradas** | A coluna **Valor (R$)** não está na lista, ou o arquivo é CSV. Escolha **Contabilidade** de novo e exporte em **Excel (.xlsx)** ou **PDF** |
| Não vejo a visão **Contabilidade** | Recarregue a página (F5). Se aparecer *As visões e as colunas não carregaram: a lista ficou na de sempre.*, clique em **Tentar de novo** |
| **PDF** desligado e *O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.* | Escolha um período menor ou use o **Excel (.xlsx)** |
| Não acho o **Montar relatório…** em Lançamentos | Ele saiu de Lançamentos. A visão **Contabilidade** faz o mesmo, direto na lista |

Os dois caminhos ficam na Auditoria: o botão da **Visão geral** aparece como
*Gerou o documento "Relatório de receitas: …"*, e o **Exportar** da lista, como
as outras exportações, com o nome da visão em **Modelo**. Todo arquivo baixado
fica na [Auditoria](?topico=auditoria). Ele leva CNPJ e CPF de quem pagou: não
mande por grupo de WhatsApp.
