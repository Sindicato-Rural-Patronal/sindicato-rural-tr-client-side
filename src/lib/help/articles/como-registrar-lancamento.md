---
titulo: Como registrar um lançamento no caixa
resumo: Entrada ou saída de dinheiro, com nome de quem recebeu ou pagou, comprovante e nota de empenho.
grupo: como-fazer
ordem: 8
permissao: READ_FINANCE
veja: financeiro, exportar-planilhas
busca: lancamento caixa entrada saida pagar receber registrar despesa nota empenho nome razao social fornecedor mes fechado travado
---

## Antes de começar

- Tenha em mãos o **valor**, a **data** e o que foi pago ou recebido.
- Se o caixa estiver com o **mês fechado**, o sistema não deixa registrar nada com
  data naquele mês. Veja **Se algo der errado**, no fim da página.

## Passo a passo

1. Abra **Financeiro** e vá na aba **Lançamentos**.
2. Clique em **Novo lançamento**.
3. Escolha o **tipo**: **Entrada**, **Saída** ou **Só nota** (esta última não
   mexe no caixa, só serve para gerar a Nota de Empenho).
4. Informe o **Valor** e a **Data**.
5. Escreva a **Descrição**.
6. Em **Nome / Razão social**, escreva **quem recebeu ou quem pagou**: o
   fornecedor, a empresa ou a pessoa. Fica logo abaixo da **Descrição** e não é
   obrigatório.
7. Escolha a **Categoria** e o **Caixa**.
8. Escolha a **Forma de pagamento**. Se a que você precisa não existe, use
   **+ Nova forma de pagamento**.
9. Anexe o **comprovante**, se houver, em **Anexar comprovante**.
10. Clique em **Registrar**.

Os campos com **\*** são obrigatórios: **Valor**, **Data** e **Descrição**.

> O **Nome / Razão social** aparece na lista, entra na busca e vai para a
> planilha e o relatório. Por isso vale preencher, mesmo sem nota de empenho.

## Lançando vários de uma vez

Use **Registrar e novo**: ele salva e já abre o próximo, mantendo data, tipo,
categoria, caixa e forma de pagamento. Para uma pilha de notas do mesmo dia,
economiza muito clique.

Para repetir um lançamento antigo, use **Repetir** na linha dele: nasce um novo
com a data de hoje, **sem** os comprovantes nem os números da nota.

## Nota de empenho

No mesmo formulário, abra **Nota de Empenho** e vincule o fornecedor — pela aba
**Pessoa** ou pela aba **Empresa**. Escolhendo, os dados (nome, CNPJ ou CPF,
endereço) são preenchidos sozinhos, inclusive o **Nome / Razão social** que fica
lá em cima.

Os campos ficam como um **retrato do momento da emissão**: mudar o cadastro do
fornecedor depois não reescreve a nota já emitida.

Na busca da aba **Pessoa**, quem é associado em dia aparece com o selo
**Associado** junto do nome.

## O que se repete todo mês

Não lance na mão: cadastre na aba **Recorrentes**. Ao abrir a tela, o sistema
cria sozinho os lançamentos que faltam até o mês atual, um por mês.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| *Informe um valor maior que zero.* | Digite o **Valor** em reais, acima de R$ 0,00 |
| *Informe a descrição.* | Preencha a **Descrição** |
| Faixa amarela embaixo da **Data**: *Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba Fechamento.* | O caixa e a data escolhidos caem num mês fechado. Os botões **Registrar**, **Registrar e novo** e **Salvar** ficam desligados. Troque a data ou o caixa, ou reabra o mês em **Financeiro › Fechamento** (precisa da permissão de excluir no Financeiro). Veja [Financeiro](?topico=financeiro) |
