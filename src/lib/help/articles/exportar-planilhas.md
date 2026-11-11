---
titulo: Exportar planilhas
resumo: Tirar as listas do painel em planilha (CSV ou Excel) ou PDF, e o que fica registrado na Auditoria.
grupo: dia-a-dia
ordem: 7
veja: montar-relatorio, busca-e-filtros, auditoria, usuarios, cursos, financeiro
busca: exportar csv excel xlsx planilha do excel aba sobre baixar relatorio pdf lista selecionados download montar colunas campos telefone formatado 4,5e+10 padrao como hoje auditoria registrado exportou a planilha exportou a planilha do excel exportou o relatorio em pdf gerou o documento documento lista de presenca ficha de inscricao nota de empenho recibo unimed imprimir agenda numero n anterior ordem lancamentos financeiro resumo resumido resumida folha em pe deitada 2.000 linhas 20.000 linhas o pdf aceita ate nao foi possivel montar o pdf aba ano proximos armazenados relatorio de cadastros copiar telefones copiar e-mails muitos documentos seguidos ficha da pessoa ficha da empresa ficha completa dados da empresa planilha baixada
---

Toda lista do painel exporta em planilha. O botão **Exportar** fica no topo da
lista (nas inscrições de um curso, ele se chama **Planilha**). Em várias listas,
cada linha também tem um ícone de download, para levar só aquele registro.

## As três formas de exportar

| Opção | O que leva |
|---|---|
| **Selecionados (N)** | Só as linhas que você marcou na caixinha |
| **Todos com os filtros atuais** | Tudo o que o filtro de agora mostra — não só a página na tela |
| Ícone na linha | Aquele registro sozinho |

A diferença entre a primeira e a segunda é a que mais confunde: **"Todos" não é
"o banco inteiro"**, é tudo o que casa com os filtros que você deixou ligados.
Se quiser mesmo tudo, limpe os filtros antes. Sem filtro ligado, o item se
chama só **Todos**, com o total entre parênteses. Acima de mil, o número vem
com ponto: **Todos (2.500)**.

Nos **Cursos**, o filtro inclui a aba aberta (**Próximos** ou **Armazenados**) e
o **Ano**: o **Todos (N)** leva o mesmo número de cursos que a tela mostra.

A seleção **continua valendo quando você troca de página** — dá para marcar
cinco pessoas na página 1, ir à página 3, marcar mais três e exportar as oito.
O contador no topo mostra "8 selecionados · Limpar".

Algumas listas não têm seleção: as **Inscrições** de um curso, a **Auditoria**
e os **Lançamentos** do Financeiro. Nelas o menu só tem **Todos**. Na agenda das
salas, o menu é outro: **Este dia** ou **Esta semana** (o período da tela) e
**Escolher período…**.

## CSV ou Excel

No alto do menu **Exportar** fica a linha **Planilha**, com dois botões:
**CSV** e **Excel (.xlsx)**.

1. Clique no formato que você quer. Ele fica marcado, e o menu continua aberto.
2. Clique em **Selecionados**, em **Todos** ou num dos itens extras do menu,
   como **Propriedades dos selecionados** ou **Inscrições de todos os cursos**.
   O arquivo sai no formato marcado.

A escolha fica guardada **neste navegador** e vale para todas as listas e para
as fichas: quem marca o Excel na lista de Pessoas encontra o Excel marcado
também nos Cursos e na ficha de uma empresa. Na primeira vez, o menu começa em
**CSV**.

**Nas fichas de pessoa e de empresa**, o **Exportar** do topo tem a mesma linha
**Planilha**. **Ficha completa** (na empresa, **Dados da empresa**) e
**Propriedades (N)** saem no formato marcado. Ao terminar, aparece *Planilha com
1 registro baixada.* ou, no Excel, *Planilha do Excel com 1 registro baixada.*
Nas propriedades, o número é o delas: *Planilha com 3 registros baixada.*

Qual escolher:

| Formato | Use quando |
|---|---|
| **CSV** | Vai levar os dados para outro programa ou sistema, ou quer o arquivo de sempre. Abre no Excel e no Google Planilhas |
| **Excel (.xlsx)** | Vai abrir no Excel e trabalhar nos dados: ordenar, filtrar, somar valores, fazer mala direta |

**O Excel resolve o telefone que vira número.** No CSV, um telefone digitado só
com números pode virar *4,5E+10* quando o Excel abre o arquivo, e o zero da
frente de um CEP pode sumir. Na planilha do Excel isso não acontece: telefone,
CPF, CNS e CEP vão como texto, do jeito que estão no cadastro.

Se o menu mostra só **Planilha CSV (abre no Excel)**, sem os dois botões, o
sistema ainda não carregou os campos daquela lista ou ficha. Feche o menu e
abra de novo. Se continuar assim, recarregue a página (F5).

**Continuam só em CSV:**

- **Este dia**, **Esta semana** e **Escolher período…**, no **Exportar** da
  agenda das salas;
- o ícone de download de uma linha (e o **Exportar planilha** do menu
  **Ações**, na Unimed).

Nesses lugares, para ter o Excel, use o montador: o **Montar relatório…** do
menu tem o formato **Planilha do Excel (.xlsx)**. Para um registro só de uma
lista, marque a linha e use **Selecionados**.

## Escolher as colunas

Os itens **Selecionados** e **Todos** do menu tiram a planilha com **todas as
colunas de sempre**. Toda lista tem, no fim do menu, o item **Montar
relatório…**: você escolhe os campos e a ordem das colunas, parte de um modelo
pronto (*Nome e CPF*, *Lista de presença*, *Calendário*…) e baixa em planilha
CSV, planilha do Excel ou PDF, ou imprime. As fichas de pessoa e de empresa
também têm. O passo a passo está em
[Como montar um relatório](?topico=montar-relatorio).

Só o **Relatório de cadastros**, no topo de **Gestão › Usuários**, sai sempre
com todas as colunas.

## O arquivo

**A planilha CSV** abre direto no Excel, com acentuação correta. Se abrir no
Google Planilhas, escolha ponto e vírgula como separador.

**O telefone sai como foi digitado no cadastro.** Se ele foi digitado só com
números, o Excel pode transformá-lo num número como *4,5E+10* ao abrir o CSV.
Para evitar, baixe em **Excel (.xlsx)**. No **Montar relatório…**, além disso, o
telefone sai formatado, como *(44) 99999-8888*, em todos os modelos. Isso vale
também para o **Padrão (como hoje)**: ele tem as mesmas colunas da planilha de
sempre, na mesma ordem, mas o telefone sai formatado.

**A planilha do Excel** tem duas abas:

- **A primeira tem os dados**, com o nome da lista (*Pessoas*,
  *Lançamentos*…). A linha dos títulos fica presa no alto quando você rola, e
  não há nada acima dela: dá para ordenar, filtrar e montar tabela dinâmica
  direto.
- **A aba Sobre** diz o que é o arquivo: o relatório, quando foi gerado,
  quantos registros, o que entrou (selecionados ou todos), os filtros, o modelo
  e os campos.

Nela, telefone, CPF, CNS e CEP saem **como texto**. O valor sai **como número
em R$**, pronto para somar, e a data sai **como data**, para ordenar e filtrar
por período. Texto que começa com "=" aparece como foi escrito e não vira
fórmula do Excel.

## O PDF rápido do menu

No mesmo menu, a parte **Relatório em PDF (para imprimir)** tira a lista em PDF,
só com as colunas principais, as que cabem na folha. É o modelo **Resumo**:

- no alto, embaixo do título, vem a linha *Modelo: Resumo · Filtros: …* (com
  linhas marcadas, *Modelo: Resumo · Seleção: 8 registros*);
- com até 5 colunas, a folha sai em pé;
- o telefone sai formatado, como *(44) 99999-8888*.

Nos **Lançamentos** do Financeiro e na **Auditoria**, o modelo é outro:

- Lançamentos: **Resumido**, com Nº, Data, Descrição, Nome / Razão social e
  Valor (R$);
- Auditoria: **Resumida**, com Data e hora, Quem, Ação e Alvo.

**Acima de 2.000 linhas, depende da lista:**

| Lista | O que acontece |
|---|---|
| **Lançamentos** e **Auditoria** | Os itens do PDF ficam desligados, e o menu avisa embaixo: *O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.* Filtre a lista (o período, por exemplo) ou baixe a planilha |
| As outras listas | O PDF sai do jeito antigo: montado no seu navegador a partir da planilha, com a folha deitada e sem a linha de modelo e filtros. As colunas são as mesmas |

Nos **Lançamentos** e na **Auditoria**, se aparecer *Não foi possível montar o
PDF agora. Tente de novo ou baixe a planilha.*, o sistema não conseguiu saber
as colunas do PDF naquele momento. Espere um instante e clique de novo, ou baixe
a planilha.

Para escolher as colunas do PDF, use o **Montar relatório…**. O PDF dele aceita
até 2.000 linhas em todas as listas; acima disso, baixe a planilha ou filtre a
lista.

## Limites

| Limite | O que acontece |
|---|---|
| 20.000 linhas por planilha, CSV ou Excel | Aparece *O relatório passa de 20.000 linhas. Use um filtro para diminuir.* Filtre a lista |
| 20.000 linhas na **Auditoria** | Ela não recusa: saem só as 20.000 linhas mais recentes. O menu avisa antes do clique, embaixo do **Todos**: *Saem só as 20.000 linhas mais recentes.* Para levar as mais antigas, filtre por **De** e **Até** |
| 2.000 linhas no PDF | Veja [O PDF rápido do menu](#o-pdf-rapido-do-menu) |
| 30 exportações por minuto | Aparece *Muitas exportações seguidas. Aguarde um minuto e tente de novo.* A conta soma todo mundo que usa a mesma internet: no escritório, a equipe toda |

## Onde tem

- **Gestão › Usuários**: abas **Pessoa física** e **Associados** (com
  **Propriedades dos selecionados**), **Pessoa jurídica** (com **Propriedades
  das selecionadas**) e **Administradores**. No topo, o
  [Relatório de cadastros](#relatorio-de-cadastros), para quem vê
  administradores.
- **Gestão › Cursos** (com **Inscrições dos cursos selecionados** e
  **Inscrições de todos os cursos**) e as **Inscrições** de um curso (botão
  **Planilha**).
- **Gestão › Unimed**, **Gestão › Mensagens** e **Gestão › Auditoria**.
- **Financeiro**, aba **Lançamentos**.
- A agenda das salas, no **Painel Geral**: só as reservas (eventos e reuniões).
  Os cursos não entram.

Também há exportação no detalhe de uma pessoa (**Ficha completa** e
**Propriedades**), de uma empresa (**Dados da empresa** e **Propriedades**), de
um curso e de uma mensagem.

A planilha dos **Lançamentos** (botão **Exportar**, na aba **Lançamentos** do
Financeiro) começa pela coluna **Nº**, o número do lançamento, e traz também
**Nome / Razão social**, **CNPJ / CPF** e **Nº anterior**. O nome vem do campo
do formulário; o CNPJ ou CPF e o Nº anterior, da Nota de Empenho — vazios
quando o lançamento não tem. As linhas saem **na mesma ordem da tela**: se a
lista está em **Ordenar por › Nº**, a planilha também. Veja
[Financeiro](?topico=financeiro).

## Relatório de cadastros

O botão **Relatório de cadastros**, no topo de **Gestão › Usuários**, tira o
retrato completo do cadastro num arquivo só: as pessoas físicas, os associados
em dia, as pessoas jurídicas e os administradores. Ele ignora a busca, os
filtros e a seleção, e não tem montador. Só aparece para quem vê
administradores.

| Item do menu | O que sai |
|---|---|
| **Planilha CSV** | As quatro partes, uma embaixo da outra |
| **Planilha do Excel (.xlsx)** | Uma aba para cada parte (*Pessoas físicas*, *Associados em dia*, *Pessoas jurídicas* e *Administradores*), mais a aba *Sobre* |
| **Relatório em PDF (para imprimir)** | As quatro partes em PDF, montadas no seu navegador a partir da planilha |

Ao terminar, aparece *Relatório de cadastros baixado (1.234 registros).*

## O que fica registrado

Toda exportação fica registrada na [Auditoria](?topico=auditoria), com o nome
de quem baixou e quando: a do menu (CSV, Excel ou PDF), a do **Montar
relatório…**, a do ícone da linha, a das fichas, a planilha dos **Lançamentos**
e o **Relatório de cadastros**. Os documentos em PDF que o painel monta também
ficam (veja [Documentos em PDF](#documentos-em-pdf)). Isso não é para pegar
ninguém — é porque a planilha leva dados pessoais para fora do sistema, e o
Sindicato precisa saber por onde eles andaram.

A linha da Auditoria mostra também **o que foi exportado**: o formato, o
modelo, os campos, o que entrou (selecionados ou todos), os filtros e quantos
registros. A frase da linha cita os dados pessoais que saíram, e por isso **a
busca da Auditoria por *CPF* acha quem exportou CPF**. Só o **Relatório de
cadastros** não tem esse detalhe: a linha diz o nome do relatório e quantos
registros.

A frase diz também em que formato a lista saiu:

- planilha CSV: *Exportou a planilha "Pessoas: 3 registros (todos) · CSV · com
  CPF"*;
- planilha do Excel: *Exportou a planilha do Excel "Pessoas: 3 registros
  (todos) · Excel · com CPF"*;
- PDF, do **Montar relatório…** (baixado ou pelo **Imprimir**) ou do
  **Relatório em PDF** do menu: *Exportou o relatório em PDF "Pessoas: 4
  registros (com filtros) · PDF · com CPF"*.

> Dois PDFs aparecem na Auditoria como planilha (*Exportou a planilha "…"*): o
> **Relatório em PDF** do menu acima de 2.000 linhas, nas listas em que ele sai
> do jeito antigo, e o PDF do **Relatório de cadastros**. Os dois são montados
> no seu navegador a partir da planilha, e quem fica registrada é a planilha que
> eles buscam.

**Ainda não ficam registrados** o **Copiar telefones** e o **Copiar e-mails**
das inscrições de um curso. Eles copiam os contatos para colar em outro lugar,
sem baixar arquivo.

## Documentos em PDF

Alguns PDFs o painel monta sozinho, no seu navegador. Eles também ficam na
Auditoria:

| Documento | Onde fica o botão |
|---|---|
| **Lista de presença** | Aba **Inscrições** do curso |
| Ficha de inscrição: uma (**Baixar ficha de inscrição**, na linha) ou todas (**Exportar todas**) | Aba **Inscrições** do curso |
| Agenda (**Imprimir**) | Agenda das salas, no **Painel Geral** |
| Relatório do Financeiro (**Baixar PDF**) e **Relatório de despesas** | **Financeiro**, aba **Visão geral** |
| Nota de Empenho (**Gerar Nota de Empenho**) | **Financeiro**: a linha do lançamento e o formulário |
| Recibo (**Gerar recibo em PDF**) | **Financeiro**, aba **Lançamentos**, nas entradas |
| Ficha, Termo de adesão e Contrato da Unimed | **Gestão › Unimed**, menu **Ações**, e a aba **Unimed** da ficha da pessoa |

**Antes de gerar o documento, o painel registra na Auditoria.** A linha diz,
por exemplo:

- *Gerou o documento "Lista de presença: HORTA · 12 registros · com CPF"*

O texto entre aspas diz qual é o documento, o que ele cobre (o curso, a pessoa,
o período ou o lançamento), quantos registros tem e os dados pessoais que leva.
Essas linhas entram no filtro **Exportações**, junto com as planilhas. Veja
[Auditoria](?topico=auditoria).

**Se o registro falhar, o documento não sai.** Nenhum documento é gerado sem
ficar na Auditoria. Nesse caso, aparece uma destas mensagens:

| O que aparece | O que fazer |
|---|---|
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar esse documento. Fale com quem cuida das regras |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | A internet caiu ou o sistema não respondeu. Confira a conexão e clique de novo |

**A exceção é o PDF do Relatório de cadastros.** Ele não aparece como
documento: é montado a partir da planilha, e quem fica na Auditoria é a
planilha que ele busca, como *Exportou a planilha "Relatório de cadastros: 850
registros (todos)"*.

## A planilha é sua responsabilidade

**A planilha sai do sistema e vira sua responsabilidade.** Ela tem CPF,
telefone e endereço de associados. Não mande por grupo de WhatsApp, não deixe na
área de trabalho de um computador compartilhado e apague quando terminar o que
precisava. Melhor ainda: com o **Montar relatório…**, leve só as colunas de que
a tarefa precisa. O mesmo vale para os documentos em PDF: a ficha de inscrição e
os da Unimed levam CPF, endereço e dados de saúde.
