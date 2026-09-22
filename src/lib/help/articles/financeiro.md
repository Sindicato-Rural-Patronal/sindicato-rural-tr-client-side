---
titulo: Financeiro
resumo: Lançamentos de caixa, recorrentes, categorias, caixas e fechamento do mês.
grupo: gestao
ordem: 1
permissao: READ_FINANCE
busca: financeiro caixa lancamento entrada saida saldo categoria comprovante recorrente fechamento transferencia relatorio pdf
---

**Financeiro** tem seis abas. Começa no **Dashboard**, mas o trabalho do dia a
dia é na aba **Lançamentos**.

## Lançamentos

Cada linha é uma entrada ou uma saída de um caixa. No topo ficam os totais —
**Entradas, Saídas e Saldo** — sempre **dos filtros que você está usando**, não
do mês inteiro. Mudou o filtro, mudou o total.

Os filtros ficam no endereço da página, então **dá para salvar o link nos
favoritos** ou mandar para um colega e ele vê a mesma lista.

Atalhos:

- **Registrar e novo** — salva e já abre outro lançamento, mantendo data, tipo,
  categoria, caixa e forma de pagamento.
- **Repetir** (na linha) — cria um lançamento igual com a data de hoje, **sem**
  os comprovantes nem os números da nota.

**Comprovantes** podem ser anexados ao lançamento. Remover um comprovante pede
confirmação.

## Recorrentes

O molde do que se repete todo mês: descrição, valor, dia (1 a 31), primeiro e
último mês, categoria, caixa e forma de pagamento.

**Ao abrir a tela, o sistema cria os lançamentos que estavam faltando** até o mês
atual. Isso é seguro: cada mês entra uma vez só, mesmo que você abra a tela dez
vezes. Se o mês for mais curto que o dia escolhido (dia 31 em fevereiro), ele usa
o último dia do mês.

O lançamento criado assim mostra o selo **Recorrente**. Apagar a recorrência
**não apaga** os lançamentos que já foram feitos.

## Categorias, Caixas e formas de pagamento

- **Categorias** — para classificar os lançamentos.
- **Caixas** — você pode ter mais de um, e há **transferência entre caixas**.
- **Formas de pagamento** são cadastráveis: no próprio lançamento há
  **+ Nova forma de pagamento**.

## Fechamento

Escolha **caixa + mês**. A tela mostra saldo anterior, entradas, saídas e o
**saldo esperado**. Você digita o **saldo contado** e, se não bater, a diferença
aparece **em vermelho**.

Existe **um fechamento por caixa e por mês**. O histórico do ano fica na mesma
aba, e um fechamento pode ser **reaberto** por quem tem permissão de exclusão.

## Relatórios

Há **exportação em CSV** (com os filtros atuais) e **relatório em PDF** do
período.
