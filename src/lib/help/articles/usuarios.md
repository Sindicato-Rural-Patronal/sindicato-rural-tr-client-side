---
titulo: Usuários e associados
resumo: Cadastrar pessoas, completar fichas e juntar cadastros repetidos.
grupo: dia-a-dia
ordem: 3
permissao: READ_USER
veja: como-cadastrar-associado, como-juntar-cadastros, empresas, unimed, cursos, exportar-planilhas, montar-relatorio
busca: associado selo pessoa fisica juridica abas cadastro cpf ficha foto ampliar propriedade dependente duplicado juntar instrutor incompleto situacao validade associacao exportar planilha montar relatorio ficha completa propriedades dos selecionados csv excel xlsx planilha baixada
---

**Gestão › Usuários** é o cadastro de pessoas do Sindicato. A tela tem quatro
abas:

| Aba | O que mostra |
|---|---|
| **Pessoa física** | Todas as pessoas do cadastro, associadas ou não |
| **Associados** | Só quem está com o selo **Associado** (veja abaixo) |
| **Pessoa jurídica** | As empresas, com o botão **Nova empresa** |
| **Administradores** | Quem tem acesso ao painel, com o botão **Novo admin** |

Cada aba tem o botão **Exportar**, com a planilha, o PDF e, no fim do menu, o
**Montar relatório…**, para escolher as colunas. Nas abas **Pessoa física** e
**Associados**, o menu leva também as propriedades das pessoas marcadas:
**Propriedades dos selecionados**, em planilha, e **Montar relatório:
propriedades dos selecionados…**. Veja
[Como montar um relatório](?topico=montar-relatorio).

## O selo "Associado"

**Associado** é a pessoa que faz parte do Sindicato. O selo amarelo
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

## Cadastrando uma pessoa

Botão **Novo associado**. O que você precisa saber:

- **O CPF é o que identifica a pessoa.** Só ele dá o erro *"CPF já cadastrado
  para outra pessoa"*. Digite só os números — o sistema formata sozinho.
- **Telefone é obrigatório. E-mail não.** Duas pessoas podem ter o mesmo
  telefone e o mesmo e-mail (casal, família) — isso é permitido de propósito.
- **Tipo de membro** é uma lista fechada: *Aluno*, *Produtor rural* e
  *Trabalhador rural assalariado/autônomo*. O sistema recusa qualquer outro
  valor.
- No **endereço**, digite o CEP e o sistema busca o resto.

## A ficha da pessoa

Clicar no nome abre a ficha completa, com:

- **Dados** — cadastro, escolaridade, gênero, etnia, necessidades especiais,
  cargo na diretoria
- **Empresas** — os vínculos com empresas (cada um com um título livre:
  sócio, contador, responsável…)
- **Propriedades** — as propriedades rurais, com endereço
- **Relações** — dependentes e cônjuge
- **Unimed** — quando a pessoa é beneficiária; veja [Unimed](?topico=unimed)

Dá para trocar a **foto** e **Exportar** a ficha completa ou as propriedades.
No menu **Exportar**, do topo da ficha, **Ficha completa** e **Propriedades
(N)** baixam a planilha no formato marcado na linha **Planilha**: **CSV** ou
**Excel (.xlsx)**, a mesma escolha das listas. Ao terminar, aparece *Planilha
com 1 registro baixada.* (no Excel, *Planilha do Excel com 1 registro
baixada.*). Embaixo, o grupo **Montar relatório (escolher campos)** tem **Ficha
completa…** e **Propriedades (N)…**, para escolher as colunas. Veja
[Exportar planilhas](?topico=exportar-planilhas).

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
