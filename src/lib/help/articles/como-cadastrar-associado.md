---
titulo: Como cadastrar um associado
resumo: O cadastro de uma pessoa no balcão, do CPF à foto.
grupo: como-fazer
ordem: 4
permissao: READ_USER
veja: usuarios, como-juntar-cadastros, como-cadastrar-empresa
busca: cadastrar associado pessoa nova ficha balcao criar novo cin identidade nacional rg documento
---

1. Abra **Gestão › Usuários** e clique em **Novo associado**.
2. **Comece pelo CPF.** O campo se chama **CPF / CIN** — ver abaixo por quê.
   Ele vem primeiro de propósito: se a pessoa já tiver cadastro, o sistema
   avisa antes de você preencher o resto.
3. **Tire a foto.** Use **Tirar foto** (câmera do aparelho) ou **Escolher
   arquivo**. A pessoa está aí na sua frente — deixar para depois é, na
   prática, ficar sem foto.
4. Preencha **nome** e **telefone**. O telefone é obrigatório; o **e-mail
   não**.
5. Escolha o **tipo de membro**: Aluno, Produtor rural ou Trabalhador rural
   assalariado/autônomo.
6. Complete o que tiver: data de nascimento, RG, escolaridade, gênero.
7. No **endereço**, digite o CEP e deixe o sistema buscar o resto. Esse
   endereço vira a **propriedade principal** da pessoa.
8. Salve. A ficha abre em seguida, para você completar o que faltar.

## O que não impede o cadastro

- **E-mail** pode ficar em branco, e pode repetir entre pessoas (casal,
  família).
- **Telefone** também pode repetir.
- **RG** pode ficar em branco (ver a seção abaixo). A ficha **não** fica
  marcada como incompleta por causa disso.
- Só o **CPF** identifica a pessoa, e só ele dá "já cadastrado".

## Quando a pessoa entrega a identidade nova (CIN)

A carteira de identidade mudou no Brasil. A nova — **CIN**, Carteira de
Identidade Nacional — **não tem número próprio**: o número dela é o **CPF**, o
mesmo em todo o país. A antiga, o RG, era um número diferente em cada estado.

O que isso muda no balcão:

- **Não procure um "RG" na carteira nova.** Não tem. O número grande ali é o
  CPF. Por isso o campo se chama **CPF / CIN**: é o mesmo número, digitado no
  mesmo lugar de sempre.
- **Deixe o RG em branco** quando a pessoa só tiver a carteira nova. Não é
  falta de informação, é o documento que deixou de ter esse número.
- **Cadastro antigo continua como está.** Quem tem RG na ficha não perde nada,
  e o RG antigo vale até 2032. O campo continua na tela justamente por isso.

Para o sistema nada mudou: é o mesmo número de 11 dígitos, conferido do mesmo
jeito.

## Se algo falhar ao salvar

A pessoa é criada primeiro; o resto (documentos, endereço, foto) vai em
seguida. Se alguma dessas partes falhar, o sistema **avisa exatamente o que não
salvou** e abre a ficha criada — é só completar ali. Não cadastre de novo: daria
"CPF já cadastrado".
