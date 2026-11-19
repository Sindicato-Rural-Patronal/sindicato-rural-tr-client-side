---
titulo: Como usar as visões em Lançamentos
resumo: Escolher a visão da lista, mudar as colunas, salvar para a equipe com os filtros, renomear, excluir e exportar o que está na tela. Com imagens da tela.
grupo: como-fazer
ordem: 16
permissao: READ_FINANCE
veja: financeiro, como-gerar-relatorio-de-receitas, exportar-planilhas, auditoria
busca: visao visoes visao da lista barra da visao colunas colunas da lista escolher colunas mudar colunas ordem das colunas campos procurar campo adicionar coluna voltar ao padrao da visao alterada salvar como salvar visao salvar alteracoes renomear excluir visao da equipe de fabrica da equipe padrao contabilidade completa como a planilha de antes resumida liga periodo mes passado mes atual ano atual ultimos 12 meses nao guardar guardar os filtros ligados agora exportar exportar o que esta na tela planilha csv excel xlsx pdf imprimir total de entradas total de saidas lancamentos financeiro celular cartoes ja existe uma visao 2.000 linhas montar relatorio menu exportar resumido modelos da equipe link favoritos
---

Em **Financeiro › Lançamentos**, você escolhe as colunas da própria lista, e o
**Exportar** baixa exatamente o que está na tela. As colunas, na ordem, mais os
filtros que elas ligam, formam uma **visão**. O sistema traz quatro visões de
fábrica, e a equipe pode salvar as suas.

## Onde fica

A barra da visão fica na aba **Lançamentos**, entre os filtros e os totais
(**Entradas**, **Saídas** e **Saldo**):

| Na barra | Para quê |
|---|---|
| **Visão** | O seletor: escolhe a visão da lista |
| **Colunas (9)** | Escolhe as colunas e a ordem. O número é quantas colunas a lista tem |
| **Salvar alterações** | Guarda na visão da equipe o que você mudou. Só aparece nas visões da equipe e fica cinza enquanto nada mudou |
| **Salvar como…** | Guarda a tela como uma visão nova da equipe |
| **⋯** | Tem **Renomear…** e **Excluir…**. Só aparece nas visões da equipe |
| **Exportar** | Baixa o que está na tela |

**Transferir** e **Novo lançamento** continuam no alto, ao lado do **Buscar**.

![A aba Lançamentos com a visão Contabilidade: os filtros em cima, a barra da visão com Visão, Colunas (9), Salvar como… e Exportar, os totais e a tabela com as 9 colunas, que rola de lado com o Valor (R$) e as Ações presos à direita](/ajuda-imagens/visoes/02-contabilidade-aplicada.jpg "A barra da visão fica entre os filtros e os totais. O contorno marca o que a visão ligou.")

## Antes de começar

- **Quem vê o Financeiro usa as visões.** Basta a permissão *Visualizar
  financeiro*. Com ela, você também cria, muda, renomeia e exclui as visões da
  equipe, inclusive as que um colega criou.
- **As visões da equipe são da equipe toda.** O que você salva, renomeia ou
  exclui vale para todos.
- **As visões de fábrica não mudam.** Para guardar a sua versão de uma delas,
  use **Salvar como…**.

## As visões de fábrica

| Visão | Colunas | O que liga |
|---|---|---|
| **Padrão** | A tabela de sempre: Nº, Data, Descrição, Nome / Razão social, Categoria, Caixa, Método e Valor (R$) | Nada: os filtros ficam como estão |
| **Contabilidade** | Nº, Data, Tipo, Nome / Razão social, CNPJ / CPF, Descrição, Categoria, Método e Valor (R$) | O período do **mês passado**, **Tipo › Entradas** e **Sem transferências entre caixas** |
| **Completa (como a planilha de antes)** | As 13 colunas da planilha de sempre: Nº, Data, Tipo, Caixa, Categoria, Descrição, Nome / Razão social, CNPJ / CPF, Nº anterior, Método, Recorrente, Valor (R$) e Observações | Nada |
| **Resumida** | Nº, Data, Descrição, Nome / Razão social e Valor (R$) | Nada |

A **Contabilidade** é a do relatório de receitas para o contador. O passo a
passo está em
[Como gerar o relatório de receitas](?topico=como-gerar-relatorio-de-receitas).

## Escolher uma visão

1. Abra **Financeiro › Lançamentos**.
2. Clique no seletor **Visão**, na barra. O menu tem dois grupos: **De
   fábrica** e **Da equipe**. Embaixo do nome, a linha *Liga: …* diz os filtros
   que a visão põe na tela.

   ![O seletor Visão aberto, com o grupo De fábrica (Padrão, Contabilidade, Completa e Resumida) e o grupo Da equipe, cada visão com a linha Liga embaixo do nome](/ajuda-imagens/visoes/01-seletor-de-visoes.png "O seletor Visão, com os dois grupos.")

3. Clique na visão. A lista troca as colunas na hora.

**O que a visão liga.** Ela troca as colunas e, nos filtros que guarda, o valor
da tela. Os outros filtros ficam como estavam. O período é sempre relativo:
*mês passado* vira as datas do mês passado, contadas a partir de hoje. Em
18/11/2026, a **Contabilidade** põe **De** 01/10/2026 e **Até** 31/10/2026.

**"(alterada)".** Mudou as colunas, ou um filtro que a visão liga (as datas, o
**Tipo**…)? O seletor mostra o nome com *(alterada)*, como **Contabilidade
(alterada)**. É só um lembrete: a visão não muda sozinha. Esse nome vai também
para o arquivo que você exportar. Para desfazer, escolha a visão de novo no
seletor, ou use **Voltar ao padrão da visão**, no painel **Colunas**. Filtro
que a visão não liga (a **Categoria**, na Contabilidade) não conta.

**A visão fica no endereço da página.** O link leva a visão e as colunas:
mandando para um colega, ele abre a mesma lista. E, quando você volta a
Lançamentos, a última visão que usou neste navegador abre sozinha.

## Mudar as colunas

**No computador:**

1. Clique em **Colunas (N)**. Abre o painel **Colunas da lista**.
2. Em **Campos**, à esquerda, marque um campo para pôr a coluna **no fim**.
   Desmarque para tirar. **Procurar campo…** acha pelo nome, sem precisar de
   acento.
3. Em **Colunas, nesta ordem**, à direita, arraste a coluna pela alça (os
   pontinhos) ou use as setas **↑** e **↓**. O **×** tira a coluna.
4. A tabela muda na hora: não há botão de aplicar. Clique fora do painel para
   fechar.

![O painel Colunas da lista aberto: à esquerda os campos em grupos, com caixas de marcar e a busca; à direita as 10 colunas em ordem, cada uma com as setas e o x; no alto o botão Voltar ao padrão da visão](/ajuda-imagens/visoes/03-painel-colunas.png "O painel Colunas, com a Nota fiscal posta no fim da visão Contabilidade.")

Algumas regras:

- Os campos ficam nos grupos Lançamento, Valores, Favorecido, Nota de Empenho,
  Sistema e Relatório. Clique no nome do grupo para abrir ou fechar.
- Dá para pôr colunas que a tabela de sempre não tinha: o desconto, os dados da
  Nota de Empenho (endereço, telefone, banco, nota fiscal, cheque), quantos
  comprovantes e a data em que o lançamento foi feito.
- A lista fica sempre com pelo menos uma coluna.
- **Ações** (os botões da linha) não é coluna que se escolhe: fica sempre por
  último.
- Quando as colunas não cabem na largura da tela, a tabela rola de lado. A
  coluna **Valor (R$)** e **Ações** ficam presas à direita, sempre à vista. Sem
  o **Valor (R$)** na visão, só **Ações** fica presa.
- **Voltar ao padrão da visão** desfaz as mudanças e põe de novo as colunas e os
  filtros da visão.

## Salvar para a equipe

### Salvar como uma visão nova

1. Monte a lista: a visão, as colunas e os filtros.
2. Clique em **Salvar como…**. Abre, embaixo da barra, o painel **Salvar como
   uma visão nova da equipe**.
3. Em **Nome da visão**, escreva para que ela serve, como *Receitas para o
   contador*. Cabem até 64 caracteres.
4. Deixe marcado **Guardar os filtros ligados agora** para a visão ligar os
   filtros que estão na tela. Desmarcado, ela guarda só as colunas.
5. Em **Período**, escolha o que a visão põe em **De** e **Até**: **não
   guardar**, **mês atual**, **mês passado**, **ano atual** ou **últimos 12
   meses**. Se as datas da tela já são as de um desses períodos, ele vem
   escolhido.
6. Leia a frase embaixo: ela diz o que a visão vai guardar, como *A visão guarda
   as 9 colunas e liga: Tipo: Entrada · Sem transferências entre caixas ·
   Período: mês passado.*
7. Clique em **Salvar visão**.

   ![O painel Salvar como uma visão nova da equipe, com o nome Receitas do mês para o contador, a caixa Guardar os filtros ligados agora marcada, o Período em mês passado e os botões Cancelar e Salvar visão](/ajuda-imagens/visoes/05-salvar-como.png "O painel Salvar como…, embaixo da barra.")

Aparece *Visão "Receitas para o contador" salva para a equipe.* A visão nova
fica aberta e entra no grupo **Da equipe** do seletor, para todos.

O que a visão guarda:

- **As colunas, na ordem.**
- **Só os filtros ligados:** **Tipo**, **Categoria**, **Caixa**, **Forma de
  pagamento**, **Ordenar por › Nº** e **Sem transferências entre caixas**.
  Filtro em **Todos**, ou caixa desmarcada, não entra: a visão não mexe nele.
- **O período, se você escolheu um.**
- **Nunca a busca nem as datas fixas.** A busca é do momento. E uma visão de
  "outubro" ficaria errada em novembro: por isso o período é sempre relativo.

O nome não pode repetir o de outra visão da equipe nem o de uma visão de
fábrica, como **Contabilidade**. Maiúscula e minúscula não contam.

### Salvar alterações

1. Abra a visão da equipe no seletor e mude o que precisar: as colunas ou os
   filtros que ela liga. O nome ganha *(alterada)*, e **Salvar alterações** liga.
2. Clique em **Salvar alterações**. O painel pergunta: *Salvar na visão
   "Receitas para o contador" o que está na tela agora? Ela muda para toda a
   equipe.*
3. Confira **Guardar os filtros ligados agora** e o **Período**, como no
   **Salvar como…**.
4. Clique em **Salvar alterações**.

   ![Uma visão da equipe com o nome Receitas para o contador (alterada), o botão Salvar alterações destacado e, embaixo da barra, a linha de quem criou e de quem editou a visão](/ajuda-imagens/visoes/06-visao-da-equipe-alterada.png "Visão da equipe alterada: o Salvar alterações fica ligado (o contorno é só para destacar).")

Aparece *Visão "Receitas para o contador" atualizada.* **A mudança vale para
todos que usam a visão.** Se ela é só para hoje, exporte sem salvar: a visão
continua como estava.

Embaixo da barra, a visão da equipe mostra quem a criou e quem a mudou por
último: *Visão da equipe, criada por gestor em 18/11/2026 e editada por bali em
19/11/2026.*

### Renomear

1. Abra a visão da equipe no seletor.
2. Clique no **⋯**, ao lado de **Salvar como…**, e depois em **Renomear…**.
3. Em **Nome da visão**, escreva o nome novo e clique em **Renomear**.

   ![O menu do botão ⋯ aberto ao lado de Salvar como…, com os itens Renomear… e Excluir…](/ajuda-imagens/visoes/07-menu-renomear-excluir.png "O ⋯ só aparece nas visões da equipe.")

Aparece *Visão renomeada para "Contabilidade do mês".* Renomear muda só o nome:
as colunas e os filtros guardados ficam como estavam.

### Excluir

1. Abra a visão da equipe no seletor.
2. Clique no **⋯** e depois em **Excluir…**.
3. O painel pergunta: *Excluir a visão "Receitas para o contador"? Ela sai da
   lista de visões para toda a equipe; a lista na tela continua como está.*
4. Clique em **Excluir**, ou em **Cancelar** para desistir.

Aparece *Visão "Receitas para o contador" excluída.* A visão some do seletor de
todos, e a lista passa para a **Padrão**, com as colunas que estavam na tela.

A visão excluída fica guardada no sistema, mas não há botão para trazê-la de
volta. Se foi engano, a [Auditoria](?topico=auditoria) mostra o nome, as colunas
e os filtros que ela tinha: monte de novo e salve. O nome fica livre.

## Exportar o que está na tela

1. Monte a lista: a visão, as colunas e os filtros.
2. Clique em **Exportar**, no fim da barra. Abre **Exportar o que está na
   tela**, com o resumo: quantos lançamentos, quantas colunas e a visão, como
   *8 lançamentos · 9 colunas · Visão: Contabilidade*. Embaixo vêm os filtros, em
   palavras.
3. Clique no formato: **Planilha CSV**, **Excel (.xlsx)**, **PDF** ou
   **Imprimir**. Um clique já baixa.

   ![O Exportar o que está na tela aberto: o resumo com 8 lançamentos, 9 colunas e a visão, a linha dos filtros, os quatro botões Planilha CSV, Excel, PDF e Imprimir e os avisos embaixo](/ajuda-imagens/visoes/04-exportar.png "O Exportar mostra o resumo, os quatro formatos e os avisos.")

O arquivo vai para a pasta de downloads, e aparece um aviso: *Planilha com 8
registros baixada.*, *Planilha do Excel com 8 registros baixada.* ou *Relatório
com 8 registros baixado.* No **Imprimir**, abre uma aba nova com o PDF, pronta
para imprimir.

O que vai no arquivo:

- **as colunas da tela, na ordem da tela**;
- **todos os lançamentos com os filtros de agora**, com a busca, e não só a
  página que aparece;
- **a ordem da lista** (**Ordenar por**);
- **o nome da visão**: no alto do PDF e na aba **Sobre** do Excel, como
  *Visão: Contabilidade* (com a visão mudada, *Contabilidade (alterada)*).

O **CNPJ / CPF** sai como foi digitado na Nota de Empenho, com ou sem
pontuação.

Os avisos embaixo dos botões:

| Aviso | O que quer dizer |
|---|---|
| *Com 9 colunas o PDF sai deitado e com letra menor.* | Aparece a partir de 9 colunas. Se o PDF ficar difícil de ler, tire colunas ou baixe a planilha |
| *Leva dados pessoais: CNPJ / CPF.* | O arquivo leva dado pessoal. É só um aviso: não impede de baixar |
| *O Excel e o PDF trazem o total de entradas no fim.* | Com a coluna **Valor (R$)**, o Excel e o PDF trazem os totais no fim. Com **Tipo › Saídas**, o total de saídas; sem **Tipo**, os dois. A planilha CSV não traz totais |
| *O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.* | A lista passa de 2.000 lançamentos, e **PDF** e **Imprimir** ficam desligados. Filtre (um período menor, por exemplo) ou baixe a planilha |

Com **Sem transferências entre caixas** desmarcada, as transferências aparecem
nas linhas, mas não entram nos totais. O arquivo avisa: *Transferências entre
caixas não entram nos totais.* Os lançamentos "só nota" também ficam fora dos
totais.

### O que saiu de Lançamentos

O menu **Exportar** antigo, com **Todos**, o **Relatório em PDF** (modelo
**Resumido**) e o **Montar relatório…**, saiu de Lançamentos. O que ele fazia,
a lista faz agora:

| Antes | Agora |
|---|---|
| A planilha de sempre (**Todos**, em CSV ou Excel) | Visão **Completa (como a planilha de antes)** › **Exportar** › **Planilha CSV** ou **Excel (.xlsx)**. A planilha CSV sai igual à de antes |
| O PDF **Resumido** | Visão **Resumida** › **Exportar** › **PDF** |
| **Montar relatório…** com o modelo **Contabilidade** | Visão **Contabilidade** › **Exportar**. Agora a visão já liga os filtros |
| Os modelos da equipe do montador | Aparecem no grupo **Da equipe** do seletor, só com as colunas. Os filtros da tela ficam como estão |

Nas outras listas (Pessoas, Cursos, Auditoria…), o **Exportar** e o **Montar
relatório…** continuam iguais. Veja [Exportar planilhas](?topico=exportar-planilhas).

## No celular

- **A barra fica em duas linhas:** **Visão** na largura toda; **Colunas** e
  **Exportar** lado a lado, embaixo.
- **A lista vira cartões.** No alto do cartão ficam a Descrição e o Valor; embaixo,
  as outras colunas da visão, uma por linha, como *Data: 27/10/2026*. Na visão
  **Padrão**, o cartão é o de sempre.

  ![Celular: a barra com o seletor Visão em Contabilidade e, embaixo, os botões Colunas (9) e Exportar lado a lado; depois os totais e dois cartões de lançamento com as colunas da visão, uma por linha](/ajuda-imagens/visoes/08-celular-barra-e-cartoes.png "No celular, a barra em duas linhas e os cartões.")

- **Salvar e mudar ficam no seletor.** **Salvar alterações**, **Salvar como…**,
  **Renomear…** e **Excluir…** aparecem no fim do menu do seletor **Visão**.

  ![Celular: o seletor Visão aberto, com os grupos De fábrica e Da equipe e o item Salvar como… no fim do menu](/ajuda-imagens/visoes/11-celular-seletor.png "No celular, o Salvar como… fica no fim do seletor.")

- **Colunas** abre uma folha, **Colunas da lista (N)**, com **↑**, **↓** e
  **×** para cada coluna. Arrastar com o dedo não funciona aqui. **Adicionar
  coluna** mostra os campos; marque os que quiser e toque em **Pronto** para
  voltar. O **Pronto** de baixo fecha a folha.

  ![Celular: a folha Colunas da lista (9) com o botão Adicionar coluna, as 9 colunas em ordem com as setas e o x, o Voltar ao padrão da visão e o botão Pronto](/ajuda-imagens/visoes/09-celular-folha-colunas.png "A folha Colunas, no celular.")

- **Exportar** abre uma folha com **Planilha CSV**, **Excel (.xlsx)** e **PDF**.
  Não tem **Imprimir**: baixe o PDF e imprima pelo leitor de PDF.

  ![Celular: a folha Exportar o que está na tela, com o resumo, os filtros, os botões Planilha CSV, Excel e PDF e os avisos](/ajuda-imagens/visoes/10-celular-folha-exportar.png "No celular, o Exportar não tem Imprimir.")

## O que fica na Auditoria

- **As visões da equipe:** criar, salvar alterações, renomear e excluir ficam na
  [Auditoria](?topico=auditoria), no tipo **Visão da lista**. A frase diz, por
  exemplo, *Criou a visão "Lançamentos: Receitas para o contador"*. Nas linhas
  **Editou** e **Excluiu**, **O que mudou** mostra o **Nome**, os **Campos** e os
  **Filtros**, em palavras. A linha **Criou** não tem **O que mudou**, como toda
  criação no sistema.
- **Cada exportação:** fica registrada como as das outras listas, com quem
  baixou e quando. No bloco **O que foi exportado**, o nome da visão aparece em
  **Modelo**.

O arquivo leva CNPJ e CPF de quem pagou e recebeu. Ele sai do sistema e vira sua
responsabilidade: não mande por grupo de WhatsApp. Veja
[Exportar planilhas](?topico=exportar-planilhas).

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| *Já existe uma visão da equipe com esse nome.* | Outra visão da equipe já tem esse nome (maiúscula e minúscula não contam). Escolha outro nome. Se a ideia era mudar aquela visão, abra-a e use **Salvar alterações** |
| *Já existe uma visão de fábrica com esse nome.* | O nome é o de uma visão de fábrica, como **Contabilidade** ou **Padrão**. Escolha outro, como *Contabilidade do mês* |
| *Informe o nome da visão.* | O **Nome da visão** está vazio. Escreva um nome e salve de novo |
| *Este relatório já tem 100 modelos da equipe. Exclua um antes de salvar outro.* | Lançamentos chegou a 100 visões da equipe. Exclua uma que ninguém usa mais e salve de novo |
| *A categoria guardada na visão não existe mais e saiu da visão.* (ou *O caixa guardado na visão…*) | A categoria (ou o caixa) que a visão ligava foi excluída, e a lista abriu sem esse filtro. Escolha o filtro certo e use **Salvar alterações** para acertar a visão |
| *1 coluna da visão não existe mais e saiu.* | O sistema deixou de ter um campo da visão. A lista abriu sem essa coluna |
| *A visão do link não existe mais: a lista abriu na Padrão.* | Alguém excluiu a visão do link (ou dos favoritos). Escolha outra no seletor |
| *As visões e as colunas não carregaram: a lista ficou na de sempre.* | A internet falhou. Clique em **Tentar de novo**. Enquanto isso, a lista funciona como antes |
| *As visões da equipe não carregaram.* | Clique em **Tentar de novo**. As visões de fábrica continuam funcionando |
| **Salvar alterações** cinza | Nada mudou nesta visão. Mude as colunas ou um filtro que ela liga |
| Não vejo **Salvar alterações** nem o **⋯** | A visão aberta é de fábrica, e elas não mudam. Use **Salvar como…** |
| O grupo **Da equipe** diz *Nenhuma ainda. Monte a lista e use "Salvar como…".* | Ninguém salvou visão ainda. Monte a lista e salve a primeira |
| Não vejo o grupo **Da equipe** nem o **Salvar como…** | O sistema não liberou as visões da equipe para você. Recarregue a página (F5). Se continuar, fale com quem cuida das regras |
| A lista abriu com datas que eu não pus | A visão liga um período: a **Contabilidade** põe o mês passado. Mude **De** e **Até**; o nome ganha *(alterada)* |
| A lista abriu numa visão que eu não escolhi | É a última que você usou neste navegador, ou a do link que você abriu. Escolha outra no seletor |
| Os botões do **Exportar** desligados e *Nenhum lançamento com esses filtros.* | A lista está vazia. Mude os filtros |
| **PDF** e **Imprimir** desligados e *O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.* | Filtre a lista (um período menor) ou baixe a planilha |
| *Muitas exportações seguidas. Aguarde um minuto e tente de novo.* | Espere um minuto. O limite soma todo mundo que usa a mesma internet |
| *O navegador não abriu outra aba: o relatório foi baixado. Abra o arquivo para imprimir.* | O navegador bloqueou a aba nova do **Imprimir**. Abra o arquivo na pasta de downloads e imprima por ele |
| *Não foi possível exportar. Tente de novo.* | Clique de novo. Se continuar, avise o suporte (veja [Problemas comuns](?topico=problemas-comuns)) |
| *Não foi possível salvar a visão. Tente de novo.* (ou *salvar as alterações*, *renomear a visão*, *excluir a visão*) | A internet falhou ou o sistema não respondeu. O painel continua aberto: clique de novo |
| Não acho o **Montar relatório…** em Lançamentos | Ele saiu de Lançamentos. Escolha as colunas em **Colunas** e use o **Exportar** da barra |
