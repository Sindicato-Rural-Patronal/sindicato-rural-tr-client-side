---
titulo: Auditoria
resumo: O histórico de tudo que foi criado, alterado e excluído no painel.
grupo: gestao
ordem: 2
permissao: READ_AUDIT
veja: administradores, seguranca, exportar-planilhas
busca: auditoria historico trilha log quem alterou ip navegador retencao guarda exportar
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

Dá para filtrar por tipo de ação, tipo de registro, administrador, período,
texto e até por **IP**. Os filtros ficam no endereço da página — o link pode ser
guardado ou enviado a um colega.

Há também **exportação** do resultado.

## Tempo de guarda

O botão **Configurações da trilha** define por quanto tempo o histórico é
mantido. Ele **só aparece** para quem tem a permissão de alterar auditoria — a
maioria dos administradores vai ver a trilha, mas não esse botão.

> Reduzir o tempo de guarda apaga histórico antigo e isso não volta. Se você vê
> esse botão, trate-o como uma decisão da diretoria, não como um ajuste de tela.
