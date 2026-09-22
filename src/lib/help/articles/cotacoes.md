---
titulo: Cotações
resumo: O lançamento diário dos preços que aparecem na página inicial.
grupo: site
ordem: 3
permissao: READ_MARKET_QUOTE
busca: cotacao preco soja milho trigo mandioca saca tonelada arroba manha tarde fonte
---

**Gestão › Cotações** é o lançamento do dia. A lista de produtos é **fixa**:
você não cadastra nem remove produto, só informa o preço.

## Lançando

Para cada produto você põe:

- o **preço**
- o período: **manhã** ou **tarde**

A **data é sempre a de hoje** — não há como lançar para outro dia por aqui.

Atalhos que economizam tempo:

- **Repetir último** preenche com o preço do lançamento anterior
- **Enter** no campo de preço pula para o próximo produto (não envia o
  formulário)

## A unidade

A unidade de cada produto (saca de 60, 50 ou 40 kg, tonelada, quilo, arroba, ou
nenhuma) é escolhida nesta mesma tela. Ela **só é gravada quando você clica em
Salvar cotações**, junto com os preços. Se algum produto der erro, o erro
aparece naquele produto — os outros são salvos.

## O aviso de preço fora da curva

Se o preço que você digitou for **mais de 20% diferente** do último lançado, o
sistema pergunta antes de gravar, com duas opções: **Corrigir** ou **Salvar
mesmo assim**.

Isso existe porque errar uma casa decimal é fácil e o preço vai direto para a
página inicial do site. Leia o aviso antes de clicar.

## Onde isso aparece

Na página inicial, com preço, unidade, dia, período e a **fonte** (que você edita
nesta mesma tela). Clicando ali, o visitante vai para `/cotacoes`, o histórico em
gráfico e tabela — 30, 90, 180 ou 365 dias.

> O Painel Geral avisa em âmbar, **em dia útil depois das 11h**, quando a cotação
> de hoje ainda não foi lançada.
