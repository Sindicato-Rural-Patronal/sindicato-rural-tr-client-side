---
titulo: Como registrar um lançamento no caixa
resumo: Entrada ou saída de dinheiro, com número, nome de quem recebeu ou pagou, comprovante e nota de empenho.
grupo: como-fazer
ordem: 8
permissao: READ_FINANCE
veja: financeiro, como-emitir-recibo, exportar-planilhas
busca: lancamento caixa entrada saida pagar receber registrar despesa nota empenho nome razao social fornecedor mes fechado travado numero n automatico proximo sequencia numero ja usado n anterior
---

## Antes de começar

- Tenha em mãos o **valor**, a **data** e o que foi pago ou recebido.
- Se o caixa estiver com o **mês fechado**, o sistema não deixa registrar nada com
  data naquele mês. Veja **Se algo der errado**, no fim da página.

## Passo a passo

1. Abra **Financeiro** e vá na aba **Lançamentos**.
2. Clique em **Novo lançamento**.
3. Olhe o campo **Nº**, no topo do formulário. **Deixe vazio**: o sistema dá o
   próximo número sozinho (o campo mostra, em cinza, *Automático (próximo:
   128)*). Veja **O número do lançamento**, mais abaixo.
4. Escolha o **tipo**: **Entrada**, **Saída** ou **Só nota** (esta última não
   mexe no caixa, só serve para gerar a Nota de Empenho).
5. Informe o **Valor** e a **Data**.
6. Escreva a **Descrição**.
7. Em **Nome / Razão social**, escreva **quem recebeu ou quem pagou**: o
   fornecedor, a empresa ou a pessoa. Fica logo abaixo da **Descrição** e não é
   obrigatório.
8. Escolha a **Categoria** e o **Caixa**.
9. Escolha a **Forma de pagamento**. Se a que você precisa não existe, use
   **+ Nova forma de pagamento**.
10. Anexe o **comprovante**, se houver, em **Anexar comprovante**.
11. Clique em **Registrar**.

Os campos com **\*** são obrigatórios: **Valor**, **Data** e **Descrição**.
O **Nº** não é: vazio, ele é automático.

Depois de registrar, o aviso diz o número que saiu: *Lançamento registrado: Nº
128*.

> O **Nome / Razão social** aparece na lista, entra na busca e vai para a
> planilha e o relatório. Por isso vale preencher, mesmo sem nota de empenho.

## O número do lançamento

Todo lançamento tem um **Nº** que **nunca se repete**, nem com o de um
lançamento excluído. Na lista, ele é a primeira coluna.

- **Vazio** (o normal): o sistema usa o próximo número.
- **Digitado**: você escolhe o número. O campo só aceita algarismos.
  - Se o número **pula** a sequência (por exemplo, o próximo é 128 e você digita
    5000), aparece **Número fora da sequência**: *Esse número pula do 128 para o
    5000. Os próximos automáticos continuam do 5001.* Clique em **Corrigir o
    número** para voltar ao campo, ou em **Usar o Nº 5000** para gravar.
  - Se o número **já é de outro lançamento**, o campo avisa embaixo e nada é
    gravado.
- **Depois de salvo**, dá para corrigir o número em **Editar** (a correção fica
  na [Auditoria](?topico=auditoria)), mas não para apagá-lo.

Na **Transferência** entre caixas e nas **Recorrentes** não há campo: o número
vem sozinho (*Transferência registrada: Nº 130 e 131*, porque ela gera dois
lançamentos). Todas as regras estão em [Financeiro](?topico=financeiro).

## Lançando vários de uma vez

Use **Registrar e novo**: ele salva e já abre o próximo, mantendo data, tipo,
categoria, caixa e forma de pagamento. Para uma pilha de notas do mesmo dia,
economiza muito clique. O **Nº** do próximo abre vazio, e ele recebe o número
seguinte.

Para repetir um lançamento antigo, use **Repetir** na linha dele: nasce um novo
com a data de hoje, **sem** os comprovantes nem os números da nota (**Nº
anterior**, nota fiscal e cheque), e com o próximo **Nº**.

## Nota de empenho

No mesmo formulário, abra **Nota de Empenho** e vincule o fornecedor: escolha
**Pessoa** ou **Empresa** e busque o cadastro. Escolhendo, os dados (nome, CNPJ ou CPF,
endereço) são preenchidos sozinhos, inclusive o **Nome / Razão social** que fica
lá em cima.

Os campos ficam como um **retrato do momento da emissão**: mudar o cadastro do
fornecedor depois não reescreve a nota já emitida.

O campo **Nº anterior (sistema antigo ou nota em papel)** é onde vai o número
que o lançamento tinha **fora** deste sistema: o de um lançamento do sistema
antigo ou o de uma nota em papel. Se você está digitando agora um lançamento
antigo, deixe o **Nº** automático e escreva o número de lá no **Nº anterior**.
Ele é diferente do **Nº** do topo do formulário, que é o número deste sistema.

Na busca de **Pessoa**, quem é associado em dia aparece com o selo
**Associado** junto do nome.

## Se o lançamento for uma entrada

Depois de registrar uma **entrada**, o menu **Mais** (o **⋯**) da linha dela
ganha **Gerar recibo em PDF**. Para o recibo sair com o nome, o CNPJ ou CPF e o endereço de quem
pagou, preencha esses dados antes: **Nome / Razão social** no formulário e o
resto na seção **Nota de Empenho**. Veja
[Como emitir um recibo](?topico=como-emitir-recibo).

## O que se repete todo mês

Não lance na mão: cadastre na aba **Recorrentes**. Ao abrir a tela, o sistema
cria sozinho os lançamentos que faltam até o mês atual, um por mês.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| *Informe um valor maior que zero.* | Digite o **Valor** em reais, acima de R$ 0,00 |
| *Informe a descrição.* | Preencha a **Descrição** |
| *O número 123 já é de outro lançamento.* ou *… de um lançamento excluído.* | O **Nº** que você digitou já foi usado, e o de um lançamento excluído não volta a ser usado. O aviso aparece embaixo do campo **Nº** e nada foi gravado. Digite outro número ou deixe o campo vazio |
| *O Nº precisa ser maior que zero.* ou *O Nº pode ir até 2147483647.* | O **Nº** é um número inteiro, de 1 para cima, até esse limite. Corrija ou deixe vazio |
| Janela **Número fora da sequência** | Não é erro: é uma pergunta. Você digitou um número maior que o próximo, e os automáticos passarão a continuar dele. Se foi engano, clique em **Corrigir o número** |
| *Não dá para apagar o Nº do lançamento. Digite um número (o atual é 128).* | Na edição, o **Nº** não pode ficar vazio. Digite o número que ele deve ter (o atual aparece na mensagem) |
| Faixa âmbar embaixo da **Data**: *Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba Fechamento.* | O caixa e a data escolhidos caem num mês fechado. Os botões **Registrar**, **Registrar e novo** e **Salvar** ficam desligados. Troque a data ou o caixa, ou reabra o mês em **Financeiro › Fechamento** (precisa da permissão de excluir no Financeiro). Veja [Financeiro](?topico=financeiro) |
