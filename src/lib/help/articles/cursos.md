---
titulo: Cursos e inscrições
resumo: Criar um curso, acompanhar inscrições, marcar presença e encerrar.
grupo: dia-a-dia
ordem: 1
permissao: READ_COURSE
busca: curso aula turma inscricao inscritos aluno presenca lista certificado faep vagas
---

Tudo de curso acontece em **Gestão › Cursos**. A lista mostra cada curso com o
número de inscritos e as vagas. O botão **Novo curso** abre o formulário.

## Criando um curso

O formulário tem três abas:

- **Informações** — título, situação, sala, datas, horários, valor, carga
  horária, prazo de inscrição, nº do evento e mínimo de alunos.
- **Descrição** — o texto completo que aparece na página do curso no site.
- **Imagens** — a capa e a galeria de fotos.

Campos com **\*** são obrigatórios. A **sala** é obrigatória: é ela que põe o
curso na agenda e evita que duas coisas sejam marcadas no mesmo horário.

### A situação do curso

| Situação | O que acontece |
|---|---|
| **Público** | Aparece na lista do site e aceita inscrição |
| **Privado** | Não aparece na lista; só quem tem o link entra, e pode se inscrever |
| **Rascunho** | Não aparece e não aceita inscrição. Use enquanto estiver montando |
| **Em andamento** | Já começou: sai da lista de inscrição |
| **Concluído** | Encerrado. Nunca mais aceita inscrição |

> **Concluído nunca acontece sozinho.** Um curso em andamento só é encerrado
> quando alguém clica em **Concluir curso**. Se precisar, dá para voltar atrás
> pela edição.

### Prazo de inscrição

O prazo vale **até o fim do dia** que você escolher. Se você também informar a
hora, vale até aquela hora. O site desliga o botão *Inscrever-se* e escreve o
motivo: prazo vencido, lotado, já começou ou já terminou.

## Inscrições

Abra o curso e vá na aba **Inscrições**. Ali você vê quem se inscreveu, com
selos que ajudam na hora de cobrar (ou não cobrar):

- **Associado** — a pessoa está ativa e com a associação em dia
- **Parceira** — tem vínculo com uma empresa parceira ativa
- cargo na diretoria e cargo de contato público, quando houver

Uma inscrição precisa ser **confirmada**. Inscrição não confirmada **não impede
o curso de começar** — ela só fica lá, contando no aviso do painel.

Você pode gerar a **Ficha** de cada inscrito, **Exportar todas** as fichas e
baixar a planilha em **CSV** (abre no Excel).

## Presença

Depois que o curso começou, cada inscrição confirmada ganha os botões
**Presente** e **Faltou** — clicar de novo desmarca. Há também **Todos
presentes** e a contagem *X presentes · Y faltas · Z sem marcar*.

**Lista de presença** gera o PDF para assinar no dia. A coluna *Presença* também
vai na planilha CSV.

> **O sistema não emite certificado.** Quem emite é a **FAEP**. Não procure o
> botão: ele não existe, e isso é de propósito.

## Excluir um curso

Excluir é definitivo e leva junto as inscrições. Na prática, quase nunca é o que
você quer: se o curso não vai mais acontecer, mude a situação para **Rascunho**
(some do site e guarda o histórico).
