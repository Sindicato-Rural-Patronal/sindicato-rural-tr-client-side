---
titulo: Administradores e permissões
resumo: Convidar administradores, criar regras e decidir quem vê o quê.
grupo: gestao
ordem: 3
permissao: READ_USER
veja: como-criar-administrador, seguranca, auditoria, minha-conta, montar-relatorio
busca: administrador admin permissao regra convite acesso total senha revogar username exportar planilha montar relatorio
---

Os administradores ficam na aba **Administradores** de **Gestão › Usuários**. Quem
controla isso controla o sistema inteiro — vale ler esta página com calma.

## Como funciona o acesso

Um administrador é sempre **uma pessoa que já existe no cadastro**, com um login
por cima. E o que ele pode fazer vem de uma **regra de permissão** — nunca de
permissões soltas.

Cada regra tem nome, descrição e a lista de permissões marcadas. As permissões
vêm em conjuntos por assunto (cursos, usuários, notícias, banners, cotações,
convênios, contatos, auditoria, financeiro) e em quatro níveis: **ver, criar,
alterar e excluir**.

> **Ver** é o que liga o item no menu. Se alguém reclama que uma tela sumiu,
> quase sempre falta a permissão de *ver* daquele assunto na regra dele.

## Convidando um administrador

Use **Novo admin**. O sistema gera um **link de convite válido por 7 dias**.
Você manda o link para a pessoa e **ela mesma define usuário e senha**. O passo
a passo completo está em
[Como criar um usuário administrador](?topico=como-criar-administrador).

Esse é o caminho certo: você nunca precisa saber nem escolher a senha de outra
pessoa. Um convite pode ser **revogado** enquanto não for usado.

## Regras de permissão

Em **Gerenciar regras** você cria e edita os perfis. Existe **Conceder acesso
total**, que marca tudo de uma vez.

Alguns cuidados:

- Prefira **editar a regra** a criar uma regra nova por pessoa. Cinco regras bem
  pensadas se mantêm; vinte regras quase iguais não.
- Mudar uma regra muda **todo mundo que usa ela**, na hora.
- **Acesso total** inclui apagar coisas e mexer na auditoria. Dê a poucas
  pessoas.
- Uma regra em uso não pode ser apagada sem antes mover os administradores para
  outra.

## Senha

Um administrador pode ter a senha redefinida pela tela de edição (nova senha e
confirmação, que precisam coincidir). Cada um também troca a própria senha em
[Minha conta](?topico=minha-conta).

## Exportar a lista

A aba **Administradores** tem o botão **Exportar**, que leva os administradores
da regra escolhida no filtro (ou de todas as regras), ou só os marcados. No fim
do menu, o **Montar relatório…** deixa escolher as colunas: o modelo **Contato**
leva só Nome, Telefone e E-mail.

Quem vê administradores mas não vê usuários exporta o usuário, a regra de
acesso, a data de criação, o nome, o e-mail, o CPF e o telefone. O resto da
ficha da pessoa aparece em cinza no montador, com o motivo *Pede a permissão
Visualizar usuários*. Veja [Como montar um relatório](?topico=montar-relatorio).
