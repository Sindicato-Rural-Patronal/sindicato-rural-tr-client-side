---
titulo: Auditoria
resumo: O histórico de tudo que foi criado, alterado e excluído no painel.
grupo: gestao
ordem: 2
permissao: READ_AUDIT
veja: administradores, seguranca, exportar-planilhas, montar-relatorio
busca: auditoria historico trilha log quem alterou ip navegador retencao guarda exportar exportou o que foi exportado exportou a planilha exportou o relatorio em pdf campos cpf modelo formato fechamento de caixa fechou reabriu mes lancamento numero n corrigiu numero financeiro planilha csv montar relatorio resumida detalhes da exportacao 20.000 linhas mais recentes local aparelho dados pessoais excel xlsx exportou a planilha do excel gerou o documento documento lista de presenca ficha de inscricao recibo nota de empenho unimed agenda imprimir tipo area milhar ponto 0 registros nenhum registro modelo de relatorio modelos da equipe criou o modelo editou o modelo excluiu o modelo renomeou antes campos formato so confirmadas
---

**Gestão › Auditoria** é o histórico do painel: quem fez, o que fez e quando.
É a tela para responder "quem mexeu nisso?" sem acusar ninguém no escuro.

## Lendo a trilha

Cada linha é uma ação: **criação**, **edição**, **exclusão**, **exportação**
(planilha, PDF ou documento) ou **entrada no sistema**. Clicar na linha abre os
detalhes:

- **IP** e **local** de onde partiu
- **navegador** usado
- **O que mudou** — os campos, com o valor antes e depois
- **O que foi exportado** — nas exportações

Esse "o que mudou" é a parte mais útil: em vez de "fulano editou o curso", você
vê que o preço foi de R$ 100 para R$ 10.

Numa exportação, o bloco **O que foi exportado** mostra o **Formato**
(*Planilha CSV*, *Excel (.xlsx)* ou *PDF*), o **Modelo** (de fábrica ou da
equipe, com *(alterado)* se a pessoa mexeu nas colunas), **O que entrou**
(selecionados ou todos), quantos **Registros**, os **Filtros** e os **Campos**,
na ordem das colunas. Vale para todas as listas; só o **Relatório de
cadastros** fica sem esse bloco. Num documento em PDF, como a lista de
presença, o bloco mostra o formato *PDF*, o nome do documento em **Modelo**, o
que entrou e quantos registros. Para achar quem exportou CPF, escolha
**Exportações** no filtro **Ação** e digite *CPF* na busca. O que fica e o que
não fica registrado está em [Exportar planilhas](?topico=exportar-planilhas).

## Filtrando

Os filtros são **Ação** (criações, edições, exclusões, exportações, logins),
**Tipo** (o assunto: curso, lançamento, caixa…), **Quem** (o administrador),
**De** e **Até** (o período), o **IP** e a busca por texto. Os filtros ficam no
endereço da página — o link pode ser guardado ou enviado a um colega.

No cabeçalho do PDF, na aba *Sobre* da planilha do Excel e na linha *Filtros:*
do montador, os filtros aparecem em palavras, com o nome da tela, como *Ação:
Exportações · Tipo: Usuário*. Já a coluna da planilha que traz o tipo se chama
**Área**.

O botão **Exportar** leva a trilha com esses filtros: veja
[Exportar a trilha](#exportar-a-trilha).

### Exportações

Para ver só as exportações, escolha **Exportações** no filtro **Ação**. Ele
traz as planilhas, os PDFs e os documentos que o painel gera. A frase diz o que
saiu e em que formato:

| Frase | O que foi |
|---|---|
| *Exportou a planilha "Pessoas: 3 registros (todos) · CSV · com CPF"* | Uma planilha CSV |
| *Exportou a planilha do Excel "Pessoas: 3 registros (todos) · Excel · com CPF"* | Uma planilha do Excel (.xlsx) |
| *Exportou o relatório em PDF "Pessoas: 4 registros (com filtros) · PDF · com CPF"* | Um PDF do **Montar relatório…** (baixado ou pelo **Imprimir**) ou do **Relatório em PDF** do menu |
| *Gerou o documento "Lista de presença: HORTA · 12 registros · com CPF"* | Um documento em PDF que o painel monta: lista de presença, ficha de inscrição, **Imprimir** da agenda, **Baixar PDF** e **Relatório de despesas** do Financeiro, Nota de Empenho, recibo, ou Ficha, Termo de adesão e Contrato da Unimed |

Na frase do documento, o texto entre aspas diz qual é o documento, o que ele
cobre (o curso, a pessoa, o período ou o lançamento), quantos registros tem e
os dados pessoais que leva. Dá para achar pela busca: digite o nome do curso,
da pessoa ou o Nº do lançamento.

Acima de mil, o número da frase vem com ponto, como na tela: *Exportou a
planilha "Pessoas: 1.234 registros (todos) · CSV · com CPF"*. Com **0
registros**, nenhum dado saiu, e a frase não cita os dados pessoais: *Exportou
a planilha "Empresas: 0 registros (seleção) · CSV"*. Por isso a busca por *CPF*
não traz essa linha. Os campos escolhidos continuam no bloco **O que foi
exportado**.

O documento é registrado **antes** de ser gerado. Se o registro falha, o
documento não sai, e quem tentou vê a mensagem na tela. Por isso, todo documento
gerado tem a sua linha aqui. Veja
[Exportar planilhas](?topico=exportar-planilhas).

Todo PDF de lista aparece como *Exportou o relatório em PDF "…"*, e o nome
termina em *· PDF*. Isso vale também para o **Relatório de cadastros**, que
aparece como *Exportou o relatório em PDF "Relatório de cadastros: 850
registros (todos) · PDF"*.

Na planilha que você baixa desta tela (botão **Exportar**), a coluna **Ação**
traz a mesma frase sem o alvo: *Exportou uma planilha*, *Exportou uma planilha
do Excel* ou *Exportou um relatório em PDF*. No documento, ela diz qual foi:
*Gerou o documento "Lista de presença"*.

### Lançamentos do Financeiro

A frase de um lançamento traz o número dele, o **Nº**:

- *Criou o lançamento "nº 123 — Compra de adubo"*
- *Editou o lançamento "nº 123 — Compra de adubo"*

Assim dá para reconhecer um lançamento pelo número que aparece na lista do
Financeiro: escolha **Lançamento** no filtro **Tipo** e procure o número na
frase. Numa edição, a frase mostra o número e a descrição como ficaram
**depois** da edição.

Quando alguém **corrige o número**, a frase cita também o número antigo:

- *Editou o lançamento "nº 250 (antes nº 301) — Compra de adubo"*

Por isso você encontra a correção procurando pelo número novo ou pelo antigo.
Abra a linha: em **O que mudou** aparece o campo **Nº**, com o número de
**Antes** (301) e o de **Depois** (250).
Registros de antes da numeração seguem sem número na frase (*Criou um
lançamento*).

### Fechamento de caixa

Quando alguém fecha ou reabre um mês no Financeiro, a trilha registra. Para ver
só isso, escolha **Fechamento de caixa** no filtro **Tipo**. As linhas dizem:

- *Fechou o mês "10/2026 · BANCO"*
- *Reabriu o mês "10/2026 · BANCO"*

Ao abrir a linha de uma reabertura, **O que mudou** mostra o que estava fechado
(mês, caixa, saldo esperado, saldo contado e diferença). É o jeito de responder
"quem reabriu o mês de outubro?". Veja [Financeiro](?topico=financeiro).

### Modelos de relatório

Os modelos da equipe do **Montar relatório…** valem para todo mundo. Quando
alguém salva, muda, renomeia ou exclui um deles, a trilha registra. Para ver só
isso, escolha **Modelo de relatório** no filtro **Tipo**. A frase diz a lista e
o nome do modelo:

- *Criou o modelo de relatório "Pessoas: Telefones dos associados"*
- *Editou o modelo de relatório "Pessoas: Telefones dos associados"*
- *Excluiu o modelo de relatório "Pessoas: Telefones dos associados"*

Quando o nome muda, a frase cita também o antigo: *Editou o modelo de relatório
"Pessoas: Contatos da diretoria (antes Telefones dos associados)"*. Por isso
você acha o modelo procurando pelo nome novo ou pelo antigo.

Abra a linha para ver **O que mudou**:

| Campo | O que mostra |
|---|---|
| **Nome** | O nome do modelo |
| **Campos** | As colunas, na ordem, como *Nome, Telefone, CPF* |
| **Formato** | *CSV*, *PDF* ou *Excel* |
| **Só confirmadas** | *Sim* ou *Não*. Só nos modelos das inscrições |

Numa exclusão, a coluna **Antes** guarda o que o modelo tinha. Se alguém
excluiu um modelo por engano, dá para montar de novo com esses campos e salvar.
Veja [Como montar um relatório](?topico=montar-relatorio).

Quem só **usa** um modelo da equipe para exportar não aparece neste tipo. A
exportação fica em **Exportações**, no filtro **Ação**, com o nome do modelo em
**Modelo**, no bloco **O que foi exportado**.

## Exportar a trilha

O botão **Exportar**, no topo, leva a trilha **com os filtros de agora**. A
trilha não tem seleção: o menu leva sempre **Todos (N)**, ou **Todos com os
filtros atuais (N)** quando há filtro. O número é o mesmo da tela.

| Parte do menu | O que sai |
|---|---|
| **Planilha**, com os botões **CSV** e **Excel (.xlsx)** | A planilha com as 10 colunas de sempre: Data e hora, Quem, Ação, Área, Alvo, Caminho, IP, Local, Aparelho e Alterações. Marque o formato antes de clicar em **Todos**; o menu continua aberto ao marcar |
| **Relatório em PDF (para imprimir)** | Um PDF curto, no modelo **Resumida**: Data e hora, Quem, Ação e Alvo |
| **Montar relatório…** | Você escolhe as colunas e a ordem. Veja [Como montar um relatório](?topico=montar-relatorio) |

Na planilha do Excel, a **Data e hora** sai como data, para ordenar e filtrar.
A diferença entre CSV e Excel está em
[Exportar planilhas](?topico=exportar-planilhas).

Alguns cuidados:

- **No máximo 20.000 linhas.** Quando a trilha passa disso, saem só as 20.000
  linhas mais recentes, na planilha e no montador. O menu avisa antes do
  clique, embaixo do **Todos**: *Saem só as 20.000 linhas mais recentes.* O
  montador avisa o mesmo, e o botão de baixar conta 20.000. Para levar as mais
  antigas, filtre por **De** e **Até**.
- **PDF até 2.000 linhas.** Acima disso, o **Relatório em PDF** do menu fica
  desligado, e o menu avisa embaixo: *O PDF aceita até 2.000 linhas. Baixe a
  planilha ou use um filtro.* No montador vale o mesmo limite. Filtre por
  período ou baixe a planilha. Se aparecer *Não foi possível montar o PDF agora.
  Tente de novo ou baixe a planilha.*, espere um instante e clique de novo.
- **Detalhes da exportação.** No montador, o grupo **Detalhes** tem o campo
  **Detalhes da exportação**, que **não vem no Padrão**: marque-o à mão. Ele
  traz numa coluna o que cada exportação levou, como *Formato: PDF; Modelo: Nome
  e CPF; Campos: Nome, CPF; Escopo: com filtros; Filtros: Busca: silva; Linhas:
  3*. Nas linhas que não são exportação, ele fica vazio. Combine com
  **Exportações** no filtro **Ação**.
- **Dados pessoais.** O IP, o local e o aparelho são dados pessoais de quem usa
  o painel. Com o **Padrão**, o montador avisa *Leva dados pessoais: IP, Local,
  Aparelho.* Se você não precisa deles, use o modelo **Resumida**.

## Tempo de guarda

O botão **Configurações da trilha** define por quanto tempo o histórico é
mantido. Ele **só aparece** para quem tem a permissão de alterar auditoria — a
maioria dos administradores vai ver a trilha, mas não esse botão.

> Reduzir o tempo de guarda apaga histórico antigo e isso não volta. Se você vê
> esse botão, trate-o como uma decisão da diretoria, não como um ajuste de tela.
