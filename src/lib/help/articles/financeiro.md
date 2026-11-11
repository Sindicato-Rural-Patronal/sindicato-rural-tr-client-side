---
titulo: Financeiro
resumo: Lançamentos de caixa com número e recibo, recorrentes, categorias, caixas e fechamento do mês.
grupo: gestao
ordem: 1
permissao: READ_FINANCE
veja: como-registrar-lancamento, como-emitir-recibo, exportar-planilhas, montar-relatorio, busca-e-filtros, auditoria
busca: financeiro caixa lancamento entrada saida saldo categoria comprovante recorrente fechamento fechar reabrir mes fechado trava cadeado transferencia relatorio pdf nome razao social fornecedor nome fantasia empenho cnpj cpf coluna buscar planilha pausar reativar ativar visao geral numero n anterior numeracao sequencia automatico proximo salto corrigir ordenar ordem recibo recibos gerar recibo receber pagador despesas exportar exportar csv montar relatorio resumido excel xlsx planilha do excel forma de pagamento auditoria gerou o documento nota de empenho baixar pdf relatorio de despesas o pdf aceita ate 2.000 linhas
---

**Financeiro** tem sete abas: **Visão geral**, **Lançamentos**, **Recorrentes**,
**Categorias**, **Caixas**, **Formas de pagamento** e **Fechamento**. A tela abre
na **Visão geral**, mas o trabalho do dia a dia é na aba **Lançamentos**.

## Lançamentos

Cada linha é uma entrada ou uma saída de um caixa. No topo ficam os totais —
**Entradas, Saídas e Saldo** — sempre **dos filtros que você está usando**, não
do mês inteiro. Mudou o filtro, mudou o total.

Os filtros ficam no endereço da página, então **dá para salvar o link nos
favoritos** ou mandar para um colega e ele vê a mesma lista.

### Nome / Razão social

A lista tem a coluna **Nome / Razão social**, para saber **a quem o lançamento
se refere**: quem recebeu ou quem pagou. Lançamento sem esse nome mostra **—**.

Você preenche no formulário do lançamento, no campo **Nome / Razão social**,
**logo abaixo da Descrição**. Não precisa abrir a **Nota de Empenho**: é o mesmo
campo que a nota usa. Se você vincular uma pessoa ou uma empresa na nota, ele é
preenchido sozinho. Se a razão social ficar vazia, a lista mostra o **nome
fantasia** da nota.

Em tela larga (a partir de 1280 px) é uma coluna; em tela menor o nome desce
para uma linha miúda embaixo da descrição, no mesmo lugar.

### Buscando um lançamento

O campo de busca diz **Nº, descrição, nome ou CNPJ/CPF…** e acha por qualquer um
dos quatro, sem diferenciar maiúscula nem acento: "sao jose" acha "SÃO JOSÉ".

- **Nº** — o número do lançamento. Digite só o número (`128`); os zeros à
  esquerda não atrapalham (`0128` também acha o Nº 128). A busca acha também o
  **Nº anterior** (veja [Número do lançamento](#numero-do-lancamento)): `45` acha
  um lançamento cujo Nº anterior é `0045`.
- **Descrição e nome** — a descrição do lançamento e o nome / razão social (ou o
  nome fantasia) da nota.
- **CNPJ ou CPF** — o da Nota de Empenho. Pode digitar **com ou sem pontuação**
  (`12.345.678/0001-90` ou `12345678000190`) e também só um pedaço. Precisa de
  **3 números ou mais**; com menos que isso, a busca ignora o documento.

Como a busca olha tudo ao mesmo tempo, um número curto pode trazer outros
lançamentos junto: os que têm aquele número na descrição ou no documento. O que
você procura está entre eles.

### Ordenando a lista

O seletor **Ordenar por**, junto dos filtros (**Caixa**, **Forma**…), tem duas
opções, e as duas vão **do maior para o menor**:

- **Data** (o padrão) — o lançamento de data mais nova primeiro;
- **Nº** — o de número maior primeiro. Lançamento sem número fica por último.

A ordem vai no endereço da página, como os filtros, e é a mesma da planilha do
botão **Exportar**.

### Atalhos

- **Registrar e novo** — salva e já abre outro lançamento, mantendo data, tipo,
  categoria, caixa e forma de pagamento. O **Nº** do novo abre vazio, para ser
  automático.
- **Repetir** (na linha) — cria um lançamento igual com a data de hoje, **sem**
  os comprovantes nem os números da nota (**Nº anterior**, nota fiscal e
  cheque). O novo recebe o próximo **Nº**. O nome, o CNPJ/CPF e o endereço de
  quem pagou ou recebeu são copiados.

**Comprovantes** podem ser anexados ao lançamento. Remover um comprovante pede
confirmação.

### Linha com o selo "Mês fechado"

Quando o mês de um caixa está fechado, os lançamentos desse caixa naquele mês
ganham o selo **Mês fechado**, com um cadeado, e os botões **Editar** e
**Excluir** ficam desligados. Passe o mouse sobre o selo ou sobre o botão para
ver o motivo. **Repetir** continua ligado. Veja a seção
[Fechamento](#fechamento) mais abaixo.

## Número do lançamento

Todo lançamento tem um **Nº**: o número dele no sistema. Entrada, saída e "só
nota" usam a mesma sequência (1, 2, 3…), e o número **nunca se repete**, nem com
o de um lançamento excluído. Assim, uma nota ou um recibo impresso com o Nº 128
aponta sempre para um lançamento só.

Os lançamentos que já existiam foram numerados **por ordem de data**, a partir
do 1.

### Onde o Nº aparece

- na lista de **Lançamentos**, na **primeira coluna** (um **—** quer dizer que o
  lançamento não tem número). No celular, o cartão mostra **Nº 128** na linha de
  baixo;
- na busca e na ordem da lista, que você viu acima;
- na **Nota de Empenho**, no [recibo](#recibo-de-entrada) e no **Relatório de
  despesas**;
- na planilha e no PDF do botão **Exportar**, na primeira coluna;
- na [Auditoria](?topico=auditoria), na frase do lançamento: *Criou o lançamento
  "nº 123 — Compra de adubo"*.

### Número automático

Ao registrar um lançamento novo, **deixe o campo Nº vazio**. Ele fica no topo do
formulário e mostra, em cinza, **Automático (próximo: 128)**. O sistema dá o
próximo número: o maior que já existe, mais um. O número que saiu aparece no
aviso depois de salvar: **Lançamento registrado: Nº 128**.

Na **Transferência** entre caixas e nas **Recorrentes** o sistema numera
sozinho, sem campo. A transferência gera dois lançamentos (a saída e a entrada),
e o aviso diz **Transferência registrada: Nº 130 e 131**. Cada mês que uma
recorrência lança recebe o seu número.

**Repetir** e **Registrar e novo** abrem com o Nº vazio: o lançamento novo
recebe o próximo.

### Digitando um número

Dá para digitar o número, quando você precisa seguir a numeração de outro lugar.
O campo só aceita algarismos (até 10).

| Você digita | O que acontece |
|---|---|
| Um número **maior que o próximo** (o próximo é 128 e você digita 5000) | Aparece **Número fora da sequência**: *Esse número pula do 128 para o 5000. Os próximos automáticos continuam do 5001.* **Corrigir o número** volta ao campo e não grava nada; **Usar o Nº 5000** grava |
| Um número **menor que o próximo** e que ninguém usa (um "buraco") | Grava na hora. A sequência automática não muda |
| Um número que **já existe** | Não grava. O campo avisa embaixo: *O número 123 já é de outro lançamento.* ou *O número 123 já é de um lançamento excluído.* Digite outro, ou deixe vazio |

Cuidado com o primeiro caso. Depois que o 5000 é usado, o automático segue do
5001 e **não volta atrás**, nem se esse lançamento for excluído. Se foi
engano, escolha **Corrigir o número**.

### Corrigindo o número

Em **Editar lançamento**, o campo **Nº** vem com o número atual e a dica *A
correção do número fica na auditoria.* Digite o número certo e clique em
**Salvar**; valem as mesmas regras de cima. Na [Auditoria](?topico=auditoria), o
**O que mudou** mostra o campo **Nº**, com o número de **Antes** e o de
**Depois**.

Dá para trocar o número, mas **não para apagar**: o sistema responde *Não dá para
apagar o Nº do lançamento. Digite um número (o atual é 128).* Num mês fechado o
**Editar** fica desligado, então a correção espera o mês ser reaberto.

### Nº anterior (sistema antigo ou nota em papel)

O campo que se chamava **Nº empenho** agora é **Nº anterior (sistema antigo ou
nota em papel)**. Fica na seção **Nota de Empenho** do formulário (clique no nome
dela para abrir) e é texto livre.

Use para guardar o número que o lançamento tinha **fora** deste sistema: o do
sistema antigo ou o de uma nota em papel. Quando você digita agora um
lançamento antigo, ele recebe um **Nº novo**, e o número de lá vai no **Nº
anterior**. A busca acha pelos dois.

Na **Nota de Empenho** em PDF, o **Nº** fica no quadro de identificação, e o
**Nº anterior** vem embaixo dele, em letra menor, quando houver. O arquivo se
chama `nota-empenho-128.pdf` (com o Nº do lançamento).

## Recibo de entrada

Em todo lançamento de **entrada** há um botão que gera o **recibo** em PDF: o
ícone de uma mão com moedas, ao lado do botão da **Nota de Empenho**. Ao passar
o mouse sobre ele, a dica diz **Gerar recibo em PDF**. O arquivo baixa na hora,
em folha A4, pronto para imprimir e assinar. Cada recibo gerado fica registrado
na [Auditoria](?topico=auditoria) (veja [Relatórios](#relatorios)).

Só **entrada** tem recibo. **Saída**, **Só nota** e transferência entre caixas
não mostram o botão. Ele funciona também com o **mês fechado**, porque o recibo
só lê o lançamento e não muda nada nele.

### O que sai no recibo

- o cabeçalho, com os dados do Sindicato (nome, CNPJ, endereço e telefone; o
  endereço e o telefone vêm de **Configurações › Dados do sindicato**);
- a palavra **RECIBO**, o **Nº** do lançamento e o valor;
- a frase: *Recebemos de **NOME**, CNPJ **00.000.000/0000-00**, endereço, a
  importância de **R$ 1.234,56** (o valor por extenso), referente a
  **descrição**.* Para quem pagou com CPF, a frase diz CPF;
- a **Forma de pagamento**, quando o lançamento tem;
- a cidade e a data por extenso, como em *Terra Roxa, 30 de outubro de 2026*. É
  o dia da **Data** do lançamento, não o dia em que você imprimiu;
- a linha da assinatura, *Assinatura do responsável*.

### De onde vêm os dados de quem pagou

O recibo é montado com o que está no lançamento. Preencha antes de gerar:

| No recibo | Onde você preenche |
|---|---|
| O nome (**Recebemos de…**) | **Nome / Razão social**, logo abaixo da **Descrição** |
| CNPJ ou CPF | **CNPJ / CPF**, na seção **Nota de Empenho** do formulário |
| Endereço | **Endereço**, **Bairro**, **CEP**, **Cidade** e **UF**, também na seção **Nota de Empenho** |
| *referente a…* | **Descrição** |

O jeito mais rápido é **vincular** a pessoa ou a empresa na seção **Nota de
Empenho** (abas **Pessoa** e **Empresa**): nome, CNPJ ou CPF e endereço vêm do
cadastro, sozinhos.

**Sem esses dados, o recibo sai sem dizer de quem veio**: *Recebemos a
importância de…* O endereço sozinho, sem nome nem documento, também não entra.
O passo a passo está em [Como emitir um recibo](?topico=como-emitir-recibo).

## Recorrentes

O molde do que se repete todo mês: descrição, valor, dia (1 a 31), primeiro e
último mês, categoria, caixa e forma de pagamento.

**Ao abrir a tela, o sistema cria os lançamentos que estavam faltando** até o mês
atual. Isso é seguro: cada mês entra uma vez só, mesmo que você abra a tela dez
vezes. Se o mês for mais curto que o dia escolhido (dia 31 em fevereiro), ele usa
o último dia do mês.

O lançamento criado assim mostra o selo **Recorrente**. Apagar a recorrência
**não apaga** os lançamentos que já foram feitos.

### Pausar e reativar

Na linha da recorrência, o botão **Pausar** (ícone de pausa) para de lançar na
hora. A coluna **Situação** passa de **Ativa** para **Pausada**.

Para voltar, use o botão **Reativar** (ícone de play, no mesmo lugar). Ele **pede
confirmação**, porque o que ficou para trás não volta:

> Os meses em que ela ficou pausada não serão lançados. Ela volta a lançar a
> partir deste mês.

Exemplo: a recorrência ficou pausada em abril e maio e você a reativou em junho.
Abril e maio **ficam sem o lançamento**; junho volta ao normal. Se um desses
meses precisa do valor, registre na mão na aba **Lançamentos**. Ligar de novo a
opção **Ativa (gera todo mês)** no **Editar** da recorrência vale o mesmo e mostra
o mesmo aviso.

### Recorrência em mês fechado

Se o mês está **fechado no caixa da recorrência**, o lançamento daquele mês
**não é criado**. Os outros meses continuam normais. Depois que você
[reabrir o mês](#fechamento), o lançamento que faltava entra na próxima vez que
o Financeiro for aberto por quem pode lançar.

## Categorias, Caixas e formas de pagamento

- **Categorias** — para classificar os lançamentos.
- **Caixas** — você pode ter mais de um, e há **transferência entre caixas**
  (botão **Transferir**, que só aparece quando existem dois caixas ou mais).
- **Formas de pagamento** têm aba própria (**Formas de pagamento**), e também
  podem nascer na hora do lançamento, pelo **+ Nova forma de pagamento**.

Na aba de formas de pagamento dá para **renomear**, **desativar** (some da lista
dos próximos lançamentos, mas continua no histórico) e **excluir**. Vale para
arrumar um nome digitado errado, que antes ficava aparecendo para sempre.
O lançamento guarda o **nome** da forma, não um vínculo: mexer aqui **nunca**
altera lançamento que já foi feito.

## Fechamento

O fechamento tem **duas funções**: conferir o caixa do mês e **trancar o mês**.
Existe **um fechamento por caixa e por mês**.

### O que é conferido

Escolha o **Caixa** e o **Mês**. A tela mostra **Saldo anterior**, **Entradas**,
**Saídas** e **Saldo esperado**. Você digita o **Saldo contado** (o que existe de
verdade no caixa) e a **Diferença** aparece ao lado: **Confere** quando bate,
**Sobrou** ou **Faltou** (em vermelho) quando não bate. O campo **Observações**
serve para dizer o motivo da diferença.

### O que fecha de verdade

Com o mês fechado, os lançamentos **daquele caixa com data naquele mês** não
podem ser:

- criados;
- editados (nenhum campo, nem a data nem o caixa);
- excluídos.

Também não dá para **mover** um lançamento para dentro ou para fora desse caixa e
desse mês. **Transferência** vale a mesma regra: é recusada se o mês está fechado
no caixa de **origem** ou no de **destino**. Excluir uma transferência também
fica travado quando o mês de um dos dois lados está fechado.

O que **não** é travado:

- o **mesmo mês em outro caixa**, que só fecha quando você fechar aquele caixa;
- lançamento **sem caixa**;
- **ver** um comprovante (clique no clipe da linha).

### Passo a passo: fechar um mês

**Antes de começar**

- Lance tudo o que falta do mês e confira as [recorrentes](#recorrentes).
- **Anexe os comprovantes que faltam.** Depois de fechado, o formulário de editar
  fica desligado e é por ele que se anexa (veja mais abaixo).
- Para fechar, você precisa da permissão de **criar** no Financeiro.

**Passo a passo**

1. Abra **Financeiro › Fechamento**.
2. Escolha o **Caixa** e o **Mês**.
3. Confira **Saldo anterior**, **Entradas**, **Saídas** e **Saldo esperado**.
4. Digite o **Saldo contado**.
5. Se o saldo não bater, escreva o motivo em **Observações**.
6. Clique em **Fechar mês**.

O botão fecha **na hora, sem perguntar de novo**. Aparece **Mês fechado!** e o mês
entra na lista **Fechamentos de** (ano e caixa) logo abaixo. Se o mês já estava
fechado, no lugar dos campos aparece o resumo (*"já está fechado em…"*) com o
botão **Reabrir mês**.

### Como o mês fechado aparece nas telas

| Onde | O que você vê |
|---|---|
| Lista de **Lançamentos** | Selo **Mês fechado** com cadeado; **Editar** e **Excluir** desligados |
| Formulário **Novo lançamento** ou **Editar lançamento** | Faixa amarela embaixo da **Data**; **Registrar**, **Registrar e novo** e **Salvar** desligados |
| Janela **Transferir entre caixas** | A mesma faixa amarela embaixo da **Data**; **Transferir** desligado |

A faixa amarela e a dica dos botões dizem o mesmo:

> Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba
> Fechamento.

Dá para sair da faixa sem reabrir nada: trocando a **Data** para um mês que está
aberto, ou o **Caixa** para outro, ela some e os botões voltam. No
**Editar lançamento** vale também o contrário: mudar a data ou o caixa para
dentro de um mês fechado liga a faixa.

### Passo a passo: reabrir um mês

**Antes de começar:** o botão **Reabrir mês** só aparece para quem tem a
permissão de **excluir** no Financeiro. Se ele não aparece para você, peça a quem
cuida dos [administradores](?topico=administradores).

1. Abra **Financeiro › Fechamento**.
2. Escolha o **Caixa** e o **Mês** (ou ache o mês na lista **Fechamentos de**).
3. Clique em **Reabrir mês**.
4. Leia a confirmação e confirme em **Reabrir mês**:

> Reabrir 10/2026 no caixa BANCO libera criar, editar e excluir os lançamentos
> desse mês. A reabertura fica registrada na auditoria.

Aparece **Mês reaberto.** Os lançamentos **não mudam**: só o mês volta a aceitar
alterações. Faça o que precisava e **feche de novo** quando terminar. Enquanto
o mês estiver reaberto, quem tem permissão pode mexer nos lançamentos dele, então
não deixe aberto à toa.

Fechar e reabrir ficam na [Auditoria](?topico=auditoria), no tipo **Fechamento de
caixa**, com as frases "Fechou o mês…" e "Reabriu o mês…" e os valores que
estavam fechados.

### Comprovante num mês fechado

Ver o comprovante continua livre. Para **anexar** (ou remover) um comprovante, a
tela usa o formulário **Editar lançamento**, e ele fica desligado num mês
fechado. Então: **reabra o mês, anexe o comprovante e feche de novo.**

A própria aba **Fechamento** diz que os comprovantes "continuam livres". É
verdade para o sistema, que não os trava; só que, na tela, o caminho para
anexar passa pelo **Editar**, que está desligado. Por isso vale anexar tudo
**antes** de fechar o mês.

### Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Selo **Mês fechado** e **Editar** e **Excluir** desligados | O mês desse caixa está fechado. Reabra o mês na aba **Fechamento** |
| Faixa amarela "Mês 10/2026 fechado no caixa BANCO…" e botões de salvar desligados | Troque a data ou o caixa, ou reabra o mês |
| Texto vermelho ao salvar: *O mês 10/2026 está fechado no caixa "BANCO". Reabra o mês para mudar lançamentos dele.* | É a mesma trava, avisada pelo servidor. **Nada foi gravado.** Reabra o mês |
| Não aparece o botão **Reabrir mês** | Falta a permissão de excluir no Financeiro. Peça a quem cuida dos administradores |
| A recorrência não lançou um mês | O caixa dela estava com o mês fechado. Reabra; o lançamento entra na próxima vez que o Financeiro for aberto |
| Não consigo anexar o comprovante | O **Editar** está desligado pelo mês fechado. Reabra, anexe e feche de novo |

## Relatórios

Na aba **Lançamentos**, o botão **Exportar** leva os lançamentos **com os
filtros e a ordem da tela**. O menu tem três partes:

| Parte do menu | O que sai |
|---|---|
| **Planilha**, com os botões **CSV** e **Excel (.xlsx)** | A planilha de sempre, com todas as colunas (veja abaixo), no formato que você marcar. Marque o formato e depois clique em **Todos** |
| **Relatório em PDF (para imprimir)** | Um PDF curto, no modelo **Resumido**: Nº, Data, Descrição, Nome / Razão social e Valor (R$) |
| **Montar relatório…** | Você escolhe as colunas e a ordem. Dá para levar o que a planilha não tem, como o desconto e o endereço, o telefone e o banco da Nota de Empenho. Veja [Como montar um relatório](?topico=montar-relatorio) |

**Para fazer contas, use o Excel.** Na planilha do Excel, o **Valor (R$)** sai
como número em reais, pronto para somar, e a **Data** sai como data, para
ordenar e filtrar por período. O CNPJ / CPF sai como texto, sem virar número. A
diferença entre CSV e Excel está em
[Exportar planilhas](?topico=exportar-planilhas).

A lista não tem seleção: o menu leva sempre **Todos (N)**, ou **Todos com os
filtros atuais (N)** quando há filtro. No montador, no cabeçalho do PDF e na
aba *Sobre* da planilha do Excel, os filtros aparecem em palavras, como
*Período: 01/10/2026 a 31/10/2026 · Tipo: Saída · Categoria: INSUMOS · Caixa:
BANCO · Forma de pagamento: PIX · Busca: adubo · Ordem: Nº*. A ordem só aparece
quando a lista está em **Ordenar por › Nº**. O filtro **Forma** aparece como
*Forma de pagamento*, mas a coluna da planilha continua se chamando **Método**.

**O PDF aceita até 2.000 lançamentos.** Acima disso, os itens do **Relatório em
PDF** ficam desligados, e o menu avisa embaixo: *O PDF aceita até 2.000 linhas.
Baixe a planilha ou use um filtro.* Escolha um período menor ou baixe a
planilha.

**A planilha (CSV ou Excel) e o PDF ficam na [Auditoria](?topico=auditoria)**,
como os das outras listas: quem baixou, quando e o que levou.

### Os PDFs do Financeiro na Auditoria

Na aba **Visão geral** ficam o **relatório em PDF** do período (**Baixar PDF**)
e o **Relatório de despesas**, no formato que o Sindicato já usa em papel. Na
aba **Lançamentos** ficam a **Nota de Empenho** e o **recibo** de cada
lançamento.

Os quatro também ficam na Auditoria. **Antes de gerar o PDF, o painel registra
o documento**, com o período ou o lançamento:

- *Gerou o documento "Relatório do Financeiro: 01/10/2026 a 31/10/2026 · 45
  registros"*
- *Gerou o documento "Recibo: Nº 128 · COOP LTDA · 1 registro"*

A Nota de Empenho gerada de dentro do formulário (botão **Gerar Nota de
Empenho**), mesmo antes de salvar o lançamento, também fica registrada. **Se o
registro falhar, o PDF não sai**, e aparece uma destas mensagens:

| O que aparece | O que fazer |
|---|---|
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar esse PDF. Fale com quem cuida das regras |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | A internet caiu ou o sistema não respondeu. Confira a conexão e clique de novo |

Veja também [Exportar planilhas](?topico=exportar-planilhas).

A planilha dos lançamentos tem as colunas Nº (a primeira), Data, Tipo, Caixa,
Categoria, Descrição, **Nome / Razão social**, **CNPJ / CPF**, **Nº anterior**,
Método, Recorrente, Valor (R$) e Observações. As três em destaque saem da Nota
de Empenho e ficam vazias quando o lançamento não tem nota. A busca digitada na
tela e o **Ordenar por** valem também para a planilha: as linhas saem na mesma
ordem da lista.

O **Relatório de despesas** traz a coluna **Nº** com o número do lançamento
(**—** quando não tem). No mesmo dia, as linhas seguem a ordem do número.
