---
titulo: Financeiro
resumo: Lançamentos de caixa, recorrentes, categorias, caixas e fechamento do mês.
grupo: gestao
ordem: 1
permissao: READ_FINANCE
veja: como-registrar-lancamento, exportar-planilhas, busca-e-filtros, auditoria
busca: financeiro caixa lancamento entrada saida saldo categoria comprovante recorrente fechamento fechar reabrir mes fechado trava cadeado transferencia relatorio pdf nome razao social fornecedor nome fantasia empenho cnpj cpf coluna buscar planilha pausar reativar ativar visao geral
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

O campo de busca diz **Descrição, nome ou CNPJ/CPF…** e acha por qualquer um dos
três, sem diferenciar maiúscula nem acento: "sao jose" acha "SÃO JOSÉ".

- **Descrição e nome** — a descrição do lançamento e o nome / razão social (ou o
  nome fantasia) da nota.
- **CNPJ ou CPF** — o da Nota de Empenho. Pode digitar **com ou sem pontuação**
  (`12.345.678/0001-90` ou `12345678000190`) e também só um pedaço. Precisa de
  **3 números ou mais**; com menos que isso, a busca ignora o documento.

### Atalhos

- **Registrar e novo** — salva e já abre outro lançamento, mantendo data, tipo,
  categoria, caixa e forma de pagamento.
- **Repetir** (na linha) — cria um lançamento igual com a data de hoje, **sem**
  os comprovantes nem os números da nota.

**Comprovantes** podem ser anexados ao lançamento. Remover um comprovante pede
confirmação.

### Linha com o selo "Mês fechado"

Quando o mês de um caixa está fechado, os lançamentos desse caixa naquele mês
ganham o selo **Mês fechado**, com um cadeado, e os botões **Editar** e
**Excluir** ficam desligados. Passe o mouse sobre o selo ou sobre o botão para
ver o motivo. **Repetir** continua ligado. Veja a seção
[Fechamento](#fechamento) logo abaixo.

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

Há **exportação em CSV** (com os filtros atuais) e **relatório em PDF** do
período.

A planilha dos lançamentos tem as colunas Data, Tipo, Caixa, Categoria,
Descrição, **Nome / Razão social**, **CNPJ / CPF**, Método, Recorrente, Valor
(R$) e Observações. As duas em destaque saem da Nota de Empenho e ficam vazias
quando o lançamento não tem nota. A busca digitada na tela vale também para a
planilha.
