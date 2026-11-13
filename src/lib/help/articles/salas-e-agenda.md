---
titulo: Salas, reservas e agenda
resumo: Marcar curso, evento ou reunião nas salas sem bater horário.
grupo: dia-a-dia
ordem: 2
permissao: READ_COURSE
veja: como-criar-reserva, como-criar-evento, cursos, eventos-no-site, painel-geral, montar-relatorio
busca: sala reserva agenda calendario reuniao evento auditorio cozinha ocupacao horario imprimir exportar planilha montar relatorio este dia esta semana escolher periodo responsavel excel xlsx auditoria gerou o documento documento nao foi gerado muitos documentos seguidos
---

A agenda das salas **não tem tela própria**: ela fica dentro do
[Painel Geral](?topico=painel-geral), no bloco **Agenda das salas**. O
calendário do mês fica à esquerda e a agenda ao lado (no celular, embaixo).
Clique num dia do calendário e a agenda mostra aquele dia.

## O que pode ser marcado

- **Curso** — vem da tela de Cursos; não se cria curso pela agenda
- **Evento** — algo aberto, que pode até aparecer no site
- **Reunião** — uso interno

Cada tipo tem um **ponto de cor** ao lado do nome, no calendário e na agenda.
Em cima do bloco, os botões **Todos**, **Curso**, **Evento** e **Reunião**
(com o mesmo ponto) mostram só um tipo, e **Todas as salas** escolhe uma sala.

## Marcando uma reserva

Clique em **Nova reserva** (ou num espaço livre da faixa de ocupação, que já
vem com a sala e a hora preenchidas; veja abaixo). No formulário: tipo, título,
sala, data, início e término, responsável, descrição.

- **Termina em outro dia** — para o que atravessa a meia-noite.
- **Repetir** toda semana ou todo mês até uma data — só na hora de criar.
- **Mostrar no site** — só para **evento**. Marcando isso, ele entra na página
  *Eventos* do site, e a agenda passa a mostrar o selo **No site**.

> Se a sala já estiver ocupada naquele horário, o sistema recusa e avisa dentro
> da própria janela. Ele **não deixa** você marcar duas coisas em cima da outra.

## Editando e excluindo

Clique no item da agenda para abrir. Numa reserva que se repete, o sistema
pergunta na hora de excluir: **Só esta data** ou **Esta e as próximas**.
Editar uma repetição muda só aquela data.

## Ocupação das salas

Na visão **Dia**, abaixo da agenda, fica **Ocupação das salas neste dia**.
Clique nela para abrir ou fechar; no celular, ela começa fechada.

Aberta, ela mostra uma linha por sala, **mesmo as vazias**. O horário vem
sempre escrito — *"08:00 às 12:00"* — então dá para bater o olho e saber o que
está livre. Há dois jeitos de ela aparecer, conforme o espaço:

- **Espaço largo:** uma faixa por hora em cada sala. Clique num espaço livre da
  faixa para marcar uma reserva já com a sala e a hora.
- **Espaço estreito** (celular, ou o painel ao lado do calendário numa tela
  menor): uma lista por sala, com o mesmo conteúdo. Cada sala tem **Marcar
  reserva nesta sala**, que já sugere o primeiro horário livre.

## Ver, exportar, imprimir

- **Dia / Semana** — a semana vai de segunda a domingo
- **Busca** por título ou responsável — atenção: a busca cobre **eventos e
  reuniões**, não cursos (a própria tela avisa)
- **Exportar** — a planilha CSV das reservas: **Este dia** ou **Esta semana**
  (o período da tela), ou **Escolher período…**. Os cursos não entram
- **Imprimir** — PDF da agenda do dia ou da semana

Esses três itens do **Exportar** saem só em CSV. Para a planilha do Excel, use
o **Montar relatório…**, logo abaixo.

No fim do menu **Exportar**, o **Montar relatório…** deixa escolher as colunas
das reservas e o formato, inclusive **Planilha do Excel (.xlsx)**. Ele leva o
período da tela (o dia, em **Dia**, ou a semana, em **Semana**), com a sala, o
tipo e a busca. Para outro período, mude o dia ou a semana na agenda antes de
abrir. Alguns detalhes:

- o único modelo de fábrica é o **Padrão (como hoje)**, com as colunas da
  planilha. **No site** e **Texto no site** ficam fora dele: marque-os em
  **Campos** se precisar. A equipe pode salvar os próprios modelos;
- os cursos também não entram, só os eventos e as reuniões;
- o montador avisa *Leva dados pessoais: Responsável.*, porque o responsável
  é uma pessoa.

O passo a passo está em [Como montar um relatório](?topico=montar-relatorio).

### O que fica registrado

A planilha e o **Imprimir** ficam na [Auditoria](?topico=auditoria). O
**Imprimir** é registrado antes de o PDF ser gerado, com o período e os filtros
da tela: *Gerou o documento "Agenda: 05/10/2026 a 11/10/2026 · 8 registros ·
com Responsável"*. Se o registro falhar, o PDF não sai e aparece uma mensagem
(veja [Se algo der errado](#se-algo-der-errado)).

## As salas em si

As seis salas quase nunca mudam, então não viraram item de menu: elas ficam em
**Configurações › Salas**, onde se ajusta nome, descrição e capacidade. A
capacidade aparece depois, na hora de escolher a sala do curso.

## Se algo der errado

| O que aparece ao clicar em **Imprimir** | O que fazer |
|---|---|
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | O PDF da agenda não sai sem ficar na Auditoria, e o registro falhou. Confira a internet e clique de novo |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar o PDF da agenda. Fale com quem cuida das regras |
| *Não foi possível gerar o PDF da agenda.* | Clique de novo. Se continuar, avise o suporte (veja [Problemas comuns](?topico=problemas-comuns)) |
