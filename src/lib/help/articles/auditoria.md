---
titulo: Auditoria
resumo: O histórico de tudo que foi criado, alterado e excluído no painel.
grupo: gestao
ordem: 2
permissao: READ_AUDIT
veja: administradores, seguranca, exportar-planilhas, montar-relatorio
busca: auditoria historico trilha log quem alterou ip navegador retencao guarda exportar exportou o que foi exportado campos cpf modelo formato fechamento de caixa fechou reabriu mes lancamento numero n corrigiu numero financeiro
---

**Gestão › Auditoria** é o histórico do painel: quem fez, o que fez e quando.
É a tela para responder "quem mexeu nisso?" sem acusar ninguém no escuro.

## Lendo a trilha

Cada linha é uma ação: **criação**, **edição**, **exclusão** ou **entrada no
sistema**. Clicar na linha abre os detalhes:

- **IP** e **local** de onde partiu
- **navegador** usado
- **O que mudou** — os campos, com o valor antes e depois
- **O que foi exportado** — nas exportações de Pessoas e de Inscrições

Esse "o que mudou" é a parte mais útil: em vez de "fulano editou o curso", você
vê que o preço foi de R$ 100 para R$ 10.

Numa exportação de Pessoas ou de Inscrições, o bloco **O que foi exportado**
mostra o **Formato**, o **Modelo**, **O que entrou** (selecionados ou todos),
quantos **Registros**, os **Filtros** e os **Campos**, na ordem das colunas. Para
achar quem exportou CPF, escolha **Exportações** no filtro **Ação** e digite
*CPF* na busca. O que fica e o que não fica registrado está em
[Exportar planilhas](?topico=exportar-planilhas).

## Filtrando

Os filtros são **Ação** (criações, edições, exclusões, exportações, logins),
**Tipo** (o assunto: curso, lançamento, caixa…), **Quem** (o administrador),
**De** e **Até** (o período), o **IP** e a busca por texto. Os filtros ficam no
endereço da página — o link pode ser guardado ou enviado a um colega.

Há também **exportação** do resultado.

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

## Tempo de guarda

O botão **Configurações da trilha** define por quanto tempo o histórico é
mantido. Ele **só aparece** para quem tem a permissão de alterar auditoria — a
maioria dos administradores vai ver a trilha, mas não esse botão.

> Reduzir o tempo de guarda apaga histórico antigo e isso não volta. Se você vê
> esse botão, trate-o como uma decisão da diretoria, não como um ajuste de tela.
