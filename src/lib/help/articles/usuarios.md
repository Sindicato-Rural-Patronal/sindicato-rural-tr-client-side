---
titulo: Usuários e associados
resumo: Cadastrar pessoas, completar fichas e juntar cadastros repetidos.
grupo: dia-a-dia
ordem: 3
permissao: READ_USER
busca: associado pessoa cadastro cpf ficha propriedade dependente duplicado juntar instrutor incompleto
---

**Gestão › Usuários** é o cadastro de pessoas do Sindicato. A tela tem três abas:
**Associados**, **Empresas** e **Admins**.

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

Dá para trocar a **foto** e **Exportar** a ficha (PDF) ou a planilha CSV.

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

1. Na aba **Associados**, o botão **Possíveis duplicados** lista os grupos
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
