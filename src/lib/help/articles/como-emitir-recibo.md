---
titulo: Como emitir um recibo
resumo: O recibo em PDF de um valor que o Sindicato recebeu, com o nome de quem pagou.
grupo: como-fazer
ordem: 13
permissao: READ_FINANCE
veja: financeiro, como-registrar-lancamento
busca: recibo recibos emitir gerar pdf imprimir assinar assinatura entrada recebimento recebemos importancia por extenso pagador quem pagou cnpj cpf endereco nome razao social numero nota de empenho financeiro auditoria gerou o documento documento nao foi gerado muitos documentos seguidos
---

O recibo é o papel que o Sindicato entrega a quem pagou. Ele sai do **lançamento
de entrada**, com o nome, o documento e o endereço de quem pagou, o valor por
extenso e o espaço para assinar.

## Antes de começar

- **O recibo é só de entrada**, isto é, de dinheiro que o Sindicato recebeu.
  Lançamento de **Saída**, **Só nota** e transferência entre caixas não têm o
  botão do recibo.
- **O lançamento precisa estar registrado.** O recibo é montado a partir dele.
  Se ainda não está, veja
  [Como registrar um lançamento no caixa](?topico=como-registrar-lancamento).
- **Preencha antes os dados de quem pagou.** O recibo usa o que está no
  lançamento:
  - **Nome / Razão social**, logo abaixo da **Descrição**;
  - **CNPJ / CPF** e **endereço**, na seção **Nota de Empenho** do formulário
    (clique no nome dela para abrir).
- **A Descrição vai para o recibo**, na frase "referente a…". Escreva de um
  jeito que quem paga entenda.
- Para completar esses dados você precisa poder **editar** no Financeiro. Num
  **mês fechado**, o **Editar** fica desligado: reabra o mês antes (veja
  [Financeiro](?topico=financeiro)). Gerar o recibo, porém, funciona mesmo com o
  mês fechado.

## Passo a passo

1. Abra **Financeiro** e vá na aba **Lançamentos**.
2. Ache a entrada. A busca aceita o **Nº**, a descrição, o nome ou o CNPJ/CPF.
3. Confira se a linha mostra o **nome** de quem pagou (na coluna **Nome / Razão
   social** ou, em tela menor, embaixo da descrição). Se faltar o nome, o
   CNPJ/CPF ou o endereço, clique em **Editar** (o lápis), preencha e clique em
   **Salvar**.
4. Na linha da entrada, clique no botão do recibo: o ícone de uma **mão com
   moedas**, ao lado do botão da Nota de Empenho. Ao passar o mouse, a dica diz
   **Gerar recibo em PDF**.
5. O PDF baixa na hora, com um nome como `recibo-128-fazenda-sao-jose.pdf` (o
   número é o **Nº** do lançamento). Abra e confira.
6. Imprima, assine em **Assinatura do responsável** e entregue a quem pagou.

Cada recibo gerado fica registrado na [Auditoria](?topico=auditoria), com o
**Nº** e o nome de quem pagou: *Gerou o documento "Recibo: Nº 128 · FAZENDA SAO
JOSE · 1 registro"*. O registro é feito antes de o PDF ser gerado. Se ele
falhar, o recibo não sai e aparece uma mensagem (veja
[Se algo der errado](#se-algo-der-errado)).

> O jeito mais rápido de preencher os dados de quem pagou: no formulário, abra
> **Nota de Empenho**, escolha a aba **Pessoa** ou **Empresa** e busque o
> cadastro. Nome, documento e endereço vêm sozinhos.

## O que sai no recibo

| Parte do recibo | De onde vem |
|---|---|
| Nome, CNPJ, endereço e telefone do Sindicato, no alto | O nome e o CNPJ são fixos; o endereço e o telefone vêm de **Configurações › Dados do sindicato** |
| **RECIBO**, o quadro **Nº** e o quadro **VALOR** | O **Nº** e o **Valor** do lançamento |
| *Recebemos de **NOME**, CNPJ **00.000.000/0000-00**, endereço…* | **Nome / Razão social**, **CNPJ / CPF** e **Endereço** (com **Bairro**, **CEP**, **Cidade** e **UF**) |
| *…a importância de **R$ 1.234,56** (valor por extenso)* | O **Valor** do lançamento |
| *…referente a **descrição**.* | A **Descrição** |
| **Forma de pagamento** | A forma do lançamento (a linha some se estiver vazia) |
| Cidade e data, como em *Terra Roxa, 30 de outubro de 2026* | A cidade vem das Configurações; a data é a **Data** do lançamento, **não o dia em que você imprimiu** |
| **Assinatura do responsável** | Linha para assinar |

Se o documento tem 11 números, o recibo diz **CPF**; se tem 14, diz **CNPJ**.

> O **Nº anterior** (o número do sistema antigo ou da nota em papel) **não**
> entra no recibo. Quem aparece nele é sempre o **Nº** do lançamento.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Não vejo o botão do recibo na linha | Só a **entrada** tem. Confira o tipo do lançamento: saída, **Só nota** e transferência não têm |
| O recibo sai com *Recebemos a importância de…*, sem dizer de quem | O lançamento está sem **Nome / Razão social** e sem **CNPJ / CPF**. Edite, preencha e gere o recibo de novo |
| Sai o nome, mas falta o CNPJ/CPF ou o endereço | Esses dados ficam na seção **Nota de Empenho** do formulário. Preencha lá e gere de novo. O endereço só aparece quando há nome ou documento |
| O quadro **Nº** não aparece no recibo | O lançamento não tem número. Avise o suporte (veja [Problemas comuns](?topico=problemas-comuns)) |
| A data do recibo está errada | O recibo mostra a **Data** do lançamento. Corrija a data no **Editar** e gere de novo |
| Preciso mudar o valor ou a descrição | O sistema não guarda o PDF: cada clique monta um recibo novo com o que o lançamento tem **agora** (e cada um fica na Auditoria). Edite o lançamento e gere de novo. O recibo que já foi impresso não muda sozinho |
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | O recibo não sai sem ficar na Auditoria, e o registro falhou. Confira a internet e clique de novo |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar o recibo. Fale com quem cuida das regras |
| Aparece *Erro ao gerar o recibo.* | Clique no botão outra vez. Se continuar, avise o suporte |
| Não acho o arquivo depois de clicar | Ele foi para a pasta de downloads do navegador |
