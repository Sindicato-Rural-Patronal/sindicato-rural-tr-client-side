---
titulo: Usuários e associados
resumo: Cadastrar pessoas, completar fichas e juntar cadastros repetidos.
grupo: dia-a-dia
ordem: 3
permissao: READ_USER
veja: como-cadastrar-associado, como-juntar-cadastros, empresas, unimed, cursos, exportar-planilhas
busca: associado selo pessoa fisica juridica abas cadastro cpf ficha foto ampliar propriedade dependente duplicado juntar instrutor incompleto situacao validade associacao
---

**Gestão › Usuários** é o cadastro de pessoas do Sindicato. A tela tem quatro
abas:

| Aba | O que mostra |
|---|---|
| **Pessoa física** | Todas as pessoas do cadastro, associadas ou não |
| **Associados** | Só quem está com o selo **Associado** (veja abaixo) |
| **Pessoa jurídica** | As empresas, com o botão **Nova empresa** |
| **Administradores** | Quem tem acesso ao painel, com o botão **Novo admin** |

## O selo "Associado"

**Associado** é a pessoa que faz parte do Sindicato. O selo âmbar
**Associado** aparece para quem está com a **Situação** *Ativo* e a **Validade da
associação** em dia — em branco, ou de hoje em diante. Quem está *Inativo* ou com
a validade vencida não ganha o selo.

Você vê o selo em cinco lugares:

- na **ficha**, ao lado do nome, no topo;
- na lista de **Pessoa física** e de **Associados**, embaixo do nome;
- na **busca de pessoa** dos formulários (por exemplo, em **Inscrever pessoa**);
- na **Nota de Empenho** do Financeiro, ao vincular uma pessoa;
- na lista de inscritos de um curso.

Para mudar quem tem o selo, abra a ficha, clique em **Editar** e acerte a
**Situação** e a **Validade da associação**, no cartão **Associação** da aba
**Dados**. O selo não aparece sozinho em quem se inscreveu pelo site: essa
pessoa nasce sem situação, até alguém marcar *Ativo*.

## A lista

No computador, cada pessoa é uma linha. No fim dela ficam três ícones: a seta
para fora, **Ver associado** (abre a ficha), o download, **Exportar associado**,
e a lixeira, **Excluir associado**. Passe o mouse sobre o ícone para ver o
nome.

No celular, a lista vira **cartões**, um por pessoa, com o nome inteiro. Toque
no nome para abrir a ficha. Os outros botões ficam no menu **Mais**, o **⋯** do
cartão. A aba **Administradores** e a **Pessoa jurídica** funcionam do mesmo
jeito.

Embaixo da lista ficam as páginas e o **Por página:**, que escolhe quantas
pessoas aparecem de cada vez.

## Cadastrando uma pessoa

Botão **Novo associado**. O que você precisa saber:

- **O CPF é o que identifica a pessoa.** Só ele dá o erro *"CPF já cadastrado
  para outra pessoa"*. Digite só os números — o sistema formata sozinho.
- **Telefone é obrigatório. E-mail não.** Duas pessoas podem ter o mesmo
  telefone e o mesmo e-mail (casal, família) — isso é permitido de propósito.
- **Tipo de membro** é uma lista fechada: *Aluno*, *Produtor rural*,
  *Trabalhador rural assalariado* e *Trabalhador rural autônomo*. O sistema
  recusa qualquer outro valor.
- No **endereço**, digite o CEP e clique em **Buscar**: o sistema preenche o
  resto.

## A ficha da pessoa

**Ver associado** na lista (ou o nome, no celular) abre a ficha completa. Em
cima dela fica **← Usuários**, que volta para a lista. As abas são:

- **Dados** — cadastro, escolaridade, gênero, etnia, necessidades especiais,
  cargo na diretoria
- **Propriedades** — as propriedades rurais, com endereço. A principal tem o
  selo **Principal**. Para trocar, abra o menu **Mais** (o **⋯**) da outra
  propriedade e clique em **Definir principal**
- **Empresas** — os vínculos com empresas (cada um com um título livre:
  sócio, contador, responsável…). Para desfazer um vínculo, clique na lixeira
  dele, **Desvincular**
- **Unimed** — o plano de saúde da pessoa; veja [Unimed](?topico=unimed)
- **Relações** — dependentes e cônjuge

Dá para trocar a **foto** e **Exportar** a ficha completa ou as propriedades em
planilha CSV. No celular, o botão **Exportar** mostra só o ícone de download.

### A foto do cadastro

Na aba **Dados**, o campo **Foto de perfil** mostra a foto **grande**. **Clique
nela para ampliar**: abre uma janela com a foto inteira, para conferir o rosto de
quem está no balcão. Para fechar, use o **X** ou aperte **Esc**. Sem foto, o
campo mostra só um boneco, e não há o que ampliar.

Para trocar a foto, clique em **Editar** e use **Galeria** (um arquivo do
computador) ou **Câmera**. A imagem é reduzida e recortada em quadrado sozinha.

### Instrutor

Na ficha existe **promover a instrutor**, que abre bio, LinkedIn, Instagram e
Facebook. A pessoa só vira instrutor **quando você salva o formulário** — o
aviso na tela diz isso.

## Cadastros incompletos

Quando alguém se inscreve num curso pelo site, entra no cadastro com o mínimo.
O painel junta essas fichas em **Cadastros incompletos**, e a ficha abre direto
no modo **Completar cadastro**. Vale reservar um tempo por semana para isso: é o
que mantém o cadastro do Sindicato utilizável.

## Cadastros repetidos — e como juntar

Como a inscrição pelo site só reconhece a pessoa **pelo CPF**, quem já estava no
sistema sem CPF acaba ganhando um segundo cadastro. Duas saídas:

1. Na aba **Pessoa física** (ou **Associados**), o botão **Possíveis duplicados** lista os grupos
   suspeitos (mesmo nome, telefone ou e-mail, com pelo menos um sem CPF), com o
   atalho **Juntar**.
2. Na ficha da pessoa, o botão **Juntar cadastros**.

A janela põe os dois lado a lado (CPF, e-mail, telefone, data de criação, número
de inscrições, empresas, propriedades e relações), você escolhe **qual fica**, e
o sistema mostra o que vai ser movido antes de confirmar.

O que acontece ao juntar:

- inscrições, vínculos com empresas, propriedades, relações, Unimed, contato
  público, instrutor e login **passam para o cadastro que fica**
- campo vazio no que fica é preenchido com o do outro
- inscrição repetida no mesmo curso é cancelada
- o cadastro removido vira **excluído** — ele **não é apagado** do banco

O sistema recusa juntar se os dois têm **CPFs diferentes** ou se **os dois têm
login**. Isso é proteção: nesses casos provavelmente não são a mesma pessoa.

> Juntar cadastros não tem botão de desfazer. Confira os dois lados antes.
