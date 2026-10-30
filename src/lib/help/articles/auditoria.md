---
titulo: Auditoria
resumo: O histórico de tudo que foi criado, alterado e excluído no painel.
grupo: gestao
ordem: 2
permissao: READ_AUDIT
veja: administradores, seguranca, exportar-planilhas
busca: auditoria historico trilha log quem alterou ip navegador retencao guarda exportar fechamento de caixa fechou reabriu mes
---

**Gestão › Auditoria** é o histórico do painel: quem fez, o que fez e quando.
É a tela para responder "quem mexeu nisso?" sem acusar ninguém no escuro.

## Lendo a trilha

Cada linha é uma ação: **criação**, **edição**, **exclusão** ou **entrada no
sistema**. Clicar na linha abre os detalhes:

- **IP** e **local** de onde partiu
- **navegador** usado
- **O que mudou** — os campos, com o valor antes e depois

Esse "o que mudou" é a parte mais útil: em vez de "fulano editou o curso", você
vê que o preço foi de R$ 100 para R$ 10.

## Filtrando

Os filtros são **Ação** (criações, edições, exclusões, exportações, logins),
**Tipo** (o assunto: curso, lançamento, caixa…), **Quem** (o administrador),
**De** e **Até** (o período), o **IP** e a busca por texto. Os filtros ficam no
endereço da página — o link pode ser guardado ou enviado a um colega.

Há também **exportação** do resultado.

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
