---
titulo: Auditoria
resumo: O histórico de tudo que foi criado, alterado e excluído no painel.
grupo: gestao
ordem: 2
permissao: READ_AUDIT
veja: administradores, seguranca, exportar-planilhas, montar-relatorio
busca: auditoria historico trilha log quem alterou ip navegador retencao guarda exportar exportou o que foi exportado exportou a planilha exportou o relatorio em pdf campos cpf modelo formato fechamento de caixa fechou reabriu mes lancamento numero n corrigiu numero financeiro planilha csv montar relatorio resumida detalhes da exportacao 20.000 linhas mais recentes local aparelho dados pessoais
---

**Gestão › Auditoria** é o histórico do painel: quem fez, o que fez e quando.
É a tela para responder "quem mexeu nisso?" sem acusar ninguém no escuro.

## Lendo a trilha

Cada linha é uma ação: **criação**, **edição**, **exclusão** ou **entrada no
sistema**. Clicar na linha abre os detalhes:

- **IP** e **local** de onde partiu
- **navegador** usado
- **O que mudou** — os campos, com o valor antes e depois
- **O que foi exportado** — nas exportações

Esse "o que mudou" é a parte mais útil: em vez de "fulano editou o curso", você
vê que o preço foi de R$ 100 para R$ 10.

Numa exportação, o bloco **O que foi exportado** mostra o **Formato**, o
**Modelo**, **O que entrou** (selecionados ou todos), quantos **Registros**, os
**Filtros** e os **Campos**, na ordem das colunas. Vale para todas as listas;
só o **Relatório de cadastros** fica sem esse bloco. Para achar quem exportou
CPF, escolha **Exportações** no filtro **Ação** e digite *CPF* na busca. O que
fica e o que não fica registrado está em
[Exportar planilhas](?topico=exportar-planilhas).

## Filtrando

Os filtros são **Ação** (criações, edições, exclusões, exportações, logins),
**Tipo** (o assunto: curso, lançamento, caixa…), **Quem** (o administrador),
**De** e **Até** (o período), o **IP** e a busca por texto. Os filtros ficam no
endereço da página — o link pode ser guardado ou enviado a um colega.

O botão **Exportar** leva a trilha com esses filtros: veja
[Exportar a trilha](#exportar-a-trilha).

### Exportações

Para ver só as exportações, escolha **Exportações** no filtro **Ação**. A frase
diz o que saiu e em que formato:

- *Exportou a planilha "Pessoas: 3 registros (todos) · CSV · com CPF"*
- *Exportou o relatório em PDF "Pessoas: 4 registros (com filtros) · PDF · com CPF"*

A segunda é o PDF: o do **Montar relatório…** (baixado ou pelo **Imprimir**) e
o do **Relatório em PDF** do menu. Dois PDFs aparecem como planilha (*CSV*),
porque são feitos no seu navegador a partir da planilha: o **Relatório em PDF**
do menu acima de 2.000 linhas e o PDF do **Relatório de cadastros**.

Na planilha que você baixa desta tela (botão **Exportar**), a coluna **Ação**
traz a mesma frase sem o nome: *Exportou uma planilha* ou *Exportou um
relatório em PDF*.

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

## Exportar a trilha

O botão **Exportar**, no topo, leva a trilha **com os filtros de agora**. A
trilha não tem seleção: o menu leva sempre **Todos (N)**, ou **Todos com os
filtros atuais (N)** quando há filtro. O número é o mesmo da tela.

| Parte do menu | O que sai |
|---|---|
| **Planilha CSV (abre no Excel)** | A planilha com as 10 colunas de sempre: Data e hora, Quem, Ação, Área, Alvo, Caminho, IP, Local, Aparelho e Alterações |
| **Relatório em PDF (para imprimir)** | Um PDF curto, no modelo **Resumida**: Data e hora, Quem, Ação e Alvo |
| **Montar relatório…** | Você escolhe as colunas e a ordem. Veja [Como montar um relatório](?topico=montar-relatorio) |

Alguns cuidados:

- **No máximo 20.000 linhas.** Quando a trilha passa disso, saem só as 20.000
  linhas mais recentes, na planilha e no montador. O montador avisa *Saem só as
  20.000 linhas mais recentes.*, e o botão de baixar conta 20.000. Para levar as
  mais antigas, filtre por **De** e **Até**.
- **PDF até 2.000 linhas.** No montador, o PDF aceita até 2.000 linhas. O
  **Relatório em PDF** do menu, acima disso, sai do jeito antigo: folha deitada
  e sem a linha de modelo e filtros.
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
