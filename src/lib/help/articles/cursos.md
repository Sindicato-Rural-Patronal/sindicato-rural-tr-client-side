---
titulo: Cursos e inscrições
resumo: Criar um curso, acompanhar inscrições, marcar presença e encerrar.
grupo: dia-a-dia
ordem: 1
permissao: READ_COURSE
veja: como-criar-curso, como-inscrever-alguem, salas-e-agenda, usuarios, exportar-planilhas, montar-relatorio, fotos-e-imagens
busca: curso aula turma inscricao inscritos aluno presenca lista certificado faep vagas cpf telefone 4 ultimos digitos site nao deixa inscrever apagar campo vazio proximos armazenados aba arquivo sumiu ordem de chegada inscrito em data hora concluido exportar planilha montar relatorio calendario ano inscricoes de todos os cursos excel xlsx ficha de inscricao baixar ficha exportar todas auditoria gerou o documento documento nao foi gerado muitos documentos seguidos visualizar usuarios permissao botao desligado relatorio em pdf numero do evento
---

Tudo de curso acontece em **Gestão › Cursos**. A lista mostra cada curso com o
número de inscritos e as vagas. O botão **Novo curso** abre o formulário.

## As abas Próximos e Armazenados

A lista tem duas abas:

| Aba | O que tem |
|---|---|
| **Próximos** | Os cursos cujo **dia do início ainda não chegou**, do mais próximo para o mais distante. É a aba que abre primeiro |
| **Armazenados** | Os cursos cujo dia do início **é hoje ou já passou**, do mais recente para o mais antigo |

**O curso muda de aba sozinho, no dia do início** (pelo horário de Brasília). Não
precisa fazer nada. Por isso, se você procura um curso que começa hoje e não o
vê em **Próximos**, olhe em **Armazenados**.

Armazenados **não é arquivo morto**. Entram ali os cursos de **qualquer
situação** que já chegaram ao dia do início — inclusive os que ainda estão
*Públicos* ou *Em andamento*. Dentro do curso armazenado tudo continua
funcionando: os **inscritos**, a **presença**, os documentos e o botão
**Concluir curso**. Quando o curso é concluído, ele aparece marcado como
**Concluído**.

A busca e o filtro de **Ano** valem nas duas abas. Trocar de aba volta para a
primeira página e **limpa os cursos que você tinha marcado** para exportar ou
excluir, para você não mexer num curso que nem está à vista.

> Se a aba estiver vazia, a tela diz **Nenhum curso próximo** ou **Nenhum curso
> armazenado**. Isso quer dizer que a aba não tem curso — ele pode estar na
> outra.

## Exportar a lista

O botão **Exportar**, no topo da lista, leva **a aba aberta, a busca e o Ano**:
o **Todos (N)** do menu é o mesmo número de cursos que a tela mostra. Com busca
ou ano, o item vira **Todos com os filtros atuais (N)**. Na aba
**Armazenados**, a planilha sai do curso mais recente para o mais antigo, como
a aba. Para levar só alguns cursos, marque-os na lista e use **Selecionados**.
No alto do menu, os botões **CSV** e **Excel (.xlsx)** escolhem o formato da
planilha (veja [Exportar planilhas](?topico=exportar-planilhas)). O
**Relatório em PDF (para imprimir)** sai com as colunas *Curso*, *Nº do
evento*, *Início* e *Descrição*, com a folha em pé.

O menu tem também:

- **Inscrições dos cursos selecionados** e **Inscrições de todos os cursos**,
  em planilha, no formato marcado;
- **Montar relatório…**, para escolher as colunas dos cursos. O modelo
  **Calendário** leva Curso, Início, Término, Sala e Instrutores;
- **Montar relatório: inscrições dos cursos selecionados…** e **Montar
  relatório: inscrições de todos os cursos…**, para escolher as colunas das
  inscrições.

**Inscrições de todos os cursos** não olha a aba, a busca nem o ano: leva as
inscrições de todos os cursos. O passo a passo do montador está em
[Como montar um relatório](?topico=montar-relatorio).

## Criando um curso

O formulário tem três abas:

- **Informações** — título, situação, sala, datas, horários, valor, carga
  horária, prazo de inscrição, nº do evento e mínimo de alunos.
- **Descrição** — o texto completo que aparece na página do curso no site.
- **Imagens** — a capa e a galeria de fotos.

Campos com **\*** são obrigatórios. A **sala** é obrigatória: é ela que põe o
curso na agenda e evita que duas coisas sejam marcadas no mesmo horário.

> **Curso parecido com um que já houve?** Use **Duplicar curso**, no menu do
> card. Ele abre a criação já preenchida, com a capa e os instrutores copiados,
> e deixa em branco justamente o que muda: datas, prazo e nº do evento. Vem como
> **Rascunho**, então dá para ajustar com calma antes de publicar. A galeria de
> fotos não é copiada — aquelas fotos eram do curso passado.

### A situação do curso

| Situação | O que acontece |
|---|---|
| **Público** | Aparece na lista do site e aceita inscrição |
| **Privado** | Não aparece na lista; só quem tem o link entra, e pode se inscrever |
| **Rascunho** | Não aparece e não aceita inscrição. Use enquanto estiver montando |
| **Em andamento** | Já começou: sai da lista de inscrição |
| **Concluído** | Encerrado. Nunca mais aceita inscrição |

> **Concluído nunca acontece sozinho.** Um curso em andamento só é encerrado
> quando alguém clica em **Concluir curso** (no rodapé da janela do curso). Se
> precisar, dá para voltar atrás pela edição. Concluir **não** muda o curso de
> aba: quem manda nisso é o dia do início, não a situação.

### Apagar um valor na edição

Ao **editar** um curso, esvaziar um campo opcional **apaga o valor** de verdade:
*Prazo de inscrição*, *Observações* e *Nº do evento* ficam vazios. Antes, o
campo em branco era ignorado e o valor antigo continuava lá.

*Valor*, *Carga horária* e *Mín. alunos* são numéricos e o sistema não guarda
"vazio" para eles: ao apagar, ficam **0**. Na tela, o campo aparece em branco
mesmo assim.

### Prazo de inscrição

O prazo vale **até o fim do dia** que você escolher. Se você também informar a
hora, vale até aquela hora. O site desliga o botão *Inscrever-se* e escreve o
motivo: prazo vencido, lotado, já começou ou já terminou.

## Inscrições

Abra o curso e vá na aba **Inscrições**. Ali você vê quem se inscreveu, **na
ordem em que chegaram**: quem se inscreveu primeiro fica no topo. Cada pessoa
mostra o dia e a hora da inscrição, no horário de Brasília:

> Inscrito em 12/10/2026 14:35

Assim dá para ver quem chegou antes, inclusive entre duas pessoas que se
inscreveram no mesmo dia. (A **Lista de presença** em papel continua em ordem
alfabética, de propósito, para facilitar a assinatura.)

Cada linha também tem selos que ajudam na hora de cobrar (ou não cobrar):

- **Associado** — a pessoa está ativa e com a associação em dia
- **Parceira** — tem vínculo com uma empresa parceira ativa
- cargo na diretoria e cargo de contato público, quando houver

Uma inscrição precisa ser **confirmada**. Inscrição não confirmada **não impede
o curso de começar** — ela só fica lá, contando no aviso do painel. Quando está
tudo certo, **Confirmar todas** resolve a lista inteira de uma vez.

### Como a pessoa se inscreve pelo site

No site, quem clica em *Inscrever-se* digita o **CPF** e os **4 últimos números
do telefone** do cadastro dela. É assim para proteger quem já tem cadastro: só o
CPF não basta para entrar na ficha de alguém.

- **O par bate com um cadastro:** o site mostra o nome com as iniciais
  ("João S.") e pergunta *É você?*. Confirmando, a inscrição entra.
- **O par não bate, ou o CPF não existe:** a resposta é a **mesma** nos dois
  casos, de propósito — o site nunca revela se um CPF tem cadastro. A pessoa
  segue para o formulário de cadastro simples.
- **O CPF já tem cadastro, mas o telefone digitado no formulário não é um dos
  dele:** o site recusa com *"Não foi possível confirmar seu cadastro pelo site.
  Procure o Sindicato"* e mostra o botão do WhatsApp. Nada é vinculado nem
  alterado na ficha existente.
- **Cinco erros na mesma hora com o mesmo CPF:** o site bloqueia aquele CPF por
  uma hora (*"Muitas tentativas com este CPF"*).

O sistema confere o telefone com os **três campos** da ficha (*Telefone*,
*Telefone 2* e *Telefone 3*), olhando só os números. Máscara e o 55 do país não
atrapalham.

> **Alguém reclamou que o site não deixa se inscrever?** Quase sempre é o
> telefone: o cadastro antigo tem um número que a pessoa não usa mais. Abra a
> ficha em [Usuários e associados](?topico=usuarios), atualize o telefone ou
> inscreva a pessoa pelo painel (logo abaixo), que não depende disso.

### Inscrever alguém pelo painel

Nem todo mundo se inscreve pelo site — muita gente liga ou aparece no balcão.
Use **Inscrever pessoa**, escolha no cadastro e pronto: entra **já confirmada** e
**ignora o prazo**, porque quem está inscrevendo é o Sindicato. O que ela não
ignora é a lotação: curso cheio recusa.

Se a pessoa ainda não existe no cadastro, a própria janela tem o atalho para
cadastrar.

### Falar com os inscritos

Cada linha tem **Conversar no WhatsApp** e **Ligar**, já com o telefone da
pessoa. No topo há **Copiar telefones** e **Copiar e-mails** de toda a lista —
serve para montar um grupo ou mandar um aviso a todos.

### Papelada

- **Baixar ficha de inscrição** — a ficha daquela pessoa, em PDF, para assinar.
- **Exportar todas** — as fichas de todos os inscritos, num PDF só.
- **Anexar ficha preenchida (PDF)** — depois de assinada, ela volta para dentro
  do sistema, presa à inscrição. É o que evita a pasta de papel.
- **Planilha** — a lista toda em planilha (CSV ou Excel) ou PDF, com os selos,
  a presença e os dados de contato. No fim do menu, **Montar relatório…** deixa
  escolher as colunas: só nome e CPF, nome e e-mail, ou uma lista de presença só
  das confirmadas. Veja [Como montar um relatório](?topico=montar-relatorio).

A ficha de inscrição leva os dados do cadastro da pessoa. Por isso, **Baixar
ficha de inscrição** e **Exportar todas** pedem também a permissão de ver
usuários. Sem ela, os dois ficam desligados, e a dica diz *Pede a permissão
Visualizar usuários*. Para liberar, quem cuida das regras marca **Visualizar**
em Usuários na sua regra.

**Os documentos ficam na [Auditoria](?topico=auditoria).** A **Lista de
presença** e as fichas de inscrição (uma ou todas) são registradas antes de o
PDF ser gerado, com o nome do curso: *Gerou o documento "Lista de presença:
HORTA · 12 registros · com CPF"*. A planilha também fica. Se o registro falhar,
o PDF não sai e aparece uma mensagem; o que fazer está em
[Se algo der errado](#se-algo-der-errado). O **Copiar telefones** e o **Copiar
e-mails** não ficam registrados.

## Começar o curso

**Confirmar início** passa o curso para *Em andamento*. Se ainda houver
inscrições não confirmadas, o sistema **avisa quantas são, mas não impede** —
a decisão é sua.

## Presença

Depois que o curso começou, cada inscrição confirmada ganha os botões
**Presente** e **Faltou** — clicar de novo desmarca. Há também **Todos
presentes** e a contagem *X presentes · Y faltas · Z sem marcar*. No dia do
início o curso já está na aba **Armazenados**: é lá que você o abre para marcar
a presença.

**Lista de presença** gera o PDF para assinar no dia, só com as inscrições
confirmadas. A coluna *Presença* também vai na planilha.

> **O sistema não emite certificado.** Quem emite é a **FAEP**. Não procure o
> botão: ele não existe, e isso é de propósito.

## Excluir um curso

Excluir é definitivo e leva junto as inscrições. Na prática, quase nunca é o que
você quer: se o curso não vai mais acontecer, mude a situação para **Rascunho**
(some do site e guarda o histórico).

## Se algo der errado

| O que aconteceu | O que fazer |
|---|---|
| O curso sumiu da lista | Olhe na aba **Armazenados**. No dia do início, o curso sai de **Próximos** sozinho. Se não estiver lá, tire a busca e o filtro de **Ano** |
| A aba diz *Nenhum curso próximo* ou *Nenhum curso armazenado* | A aba está vazia, mas o curso pode estar na outra |
| O **Exportar** não levou um curso que eu queria | Ele leva só a aba aberta, com a busca e o ano. Troque de aba ou tire os filtros e exporte de novo, ou marque os cursos e use **Selecionados** |
| *Nenhuma inscrição confirmada para a lista de presença.* | A **Lista de presença** só leva as inscrições confirmadas. Confirme as inscrições e gere de novo |
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | A **Lista de presença** ou a ficha não sai sem ficar na Auditoria, e o registro falhou. Confira a internet e clique de novo |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar esse documento. Na ficha de inscrição, aparece também quando a permissão de ver usuários saiu da sua regra com a tela aberta. Fale com quem cuida das regras |
| **Baixar ficha de inscrição** e **Exportar todas** desligados, com a dica *Pede a permissão Visualizar usuários* | A ficha leva os dados do cadastro da pessoa, e a sua regra não deixa ver usuários. Fale com quem cuida das regras: elas marcam **Visualizar** em Usuários |
