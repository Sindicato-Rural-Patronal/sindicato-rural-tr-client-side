---
titulo: Como criar um usuário administrador
resumo: Dar acesso ao painel para alguém da equipe, do convite ao primeiro login.
grupo: como-fazer
ordem: 9
permissao: READ_USER
veja: administradores, seguranca, como-cadastrar-associado
busca: criar usuario administrador admin novo convidar convite acesso painel login senha permissao regra dar acesso equipe funcionario
---

Todo administrador é uma **pessoa do cadastro** com um login por cima. Você
não cria login nem senha para ninguém: o sistema gera um **link de convite**, e
a própria pessoa escolhe o usuário e a senha dela.

> **Você nunca precisa saber a senha de ninguém.** É de propósito: senha que
> passa pela mão de outra pessoa deixa de ser dela.

## Antes de começar

- A pessoa precisa **já estar cadastrada**. Se não estiver, veja
  [Como cadastrar um associado](?topico=como-cadastrar-associado). A busca do
  convite também oferece **Cadastrar nova pessoa**, que abre em outra aba.
- Você precisa ter permissão para **criar administradores**. Sem ela, o botão
  **Novo admin** não aparece.
- Precisa existir uma **regra de permissão** que sirva para o trabalho dessa
  pessoa. Mais abaixo, em *Escolhendo a regra*, tem como decidir.

## Passo a passo

1. Abra **Gestão › Usuários** e clique na aba **Administradores**.
2. Clique em **Novo admin**. Abre o painel **Convidar administrador**.
3. Em **Pessoa**, digite o nome, o CPF ou o e-mail e escolha a pessoa na
   lista. Quem já é administrador aparece apagado, com o aviso *já é
   administrador*.
4. Em **Regra de permissão**, escolha o que ela vai poder ver e fazer.
5. Clique em **Gerar link de convite**.
6. Clique em **Copiar** e mande o link para a pessoa — pelo WhatsApp ou por
   e-mail.

Do seu lado, acabou. O convite fica em **Convites pendentes**, no alto da aba,
até ser usado. O link vale **7 dias** e só pode ser usado **uma vez**.

## O que a pessoa faz com o link

1. Abre o link. A tela mostra o nome dela e a regra que ela vai receber.
2. Escolhe um **usuário** (o login), com pelo menos 3 letras — por exemplo,
   `joao.silva`.
3. Escolhe uma **senha** com pelo menos 8 caracteres e repete no campo de
   confirmação.
4. Clica em **Criar meu acesso** e entra com o usuário e a senha que acabou de
   escolher.

No primeiro login o painel abre direto na Central de Ajuda, para ela começar
por [Como funciona o painel](?topico=primeiros-passos). E quem cuida dos
administradores recebe um aviso no sino: *"Fulano ativou o acesso ao painel"*.

## Escolhendo a regra

A regra é um conjunto de permissões por assunto (cursos, usuários, notícias,
financeiro…) em quatro níveis: **visualizar, criar, editar e excluir**.

- **Visualizar** é o que faz o item aparecer no menu. Se a pessoa disser que
  uma tela sumiu, quase sempre falta essa permissão na regra dela.
- **Use uma regra que já existe** sempre que der. Cinco regras bem pensadas se
  mantêm; vinte quase iguais, não.
- Se nenhuma servir, crie uma em **Gerenciar regras › Nova regra**, ao lado do
  botão Novo admin.
- Você só consegue dar uma regra que **caiba nas suas próprias permissões**.
  Quem não mexe no financeiro não consegue criar um administrador que mexa.
- **Acesso total** inclui apagar coisas e mexer na auditoria. Reserve para
  poucas pessoas.

## Se algo der errado

| O que aparece | O que fazer |
| --- | --- |
| **Convite inválido** ao abrir o link | O link passou dos 7 dias, já foi usado ou foi revogado. Gere um convite novo. |
| *Você não pode conceder uma regra com permissões além das suas* | Escolha uma regra menor, ou peça para alguém com mais acesso fazer o convite. |
| *Nome de usuário já existe* | Outro administrador já usa esse login. A pessoa escolhe outro — acrescentar o sobrenome costuma resolver. |
| *Este usuário já possui conta de administrador* | A pessoa já tem acesso. Para mudar o que ela pode fazer, abra o administrador pelo **lápis** e troque a regra. |
| A pessoa não aparece na busca | Ela ainda não está no cadastro. Cadastre e busque de novo. |
| A pessoa esqueceu a senha | Abra o administrador pelo **lápis** e defina uma **nova senha** provisória. Peça para ela trocar em [Minha conta](?topico=minha-conta) logo no primeiro acesso. |

## Enquanto o convite não é usado

Ele aparece em **Convites pendentes**, com a data em que expira. Mandou para a
pessoa errada ou ela desistiu? Clique na **lixeira** para **revogar** — o link
para de funcionar na hora. Convite vencido aparece como *Expirado*: é só gerar
outro pelo mesmo caminho.

## Quando alguém sai do Sindicato

Tire o acesso **no mesmo dia**: na aba **Administradores**, clique na
**lixeira** ao lado do nome. A pessoa continua no cadastro — só perde o login.
Se um dia ela voltar, basta um convite novo.
