---
titulo: Problemas comuns
resumo: O que fazer quando algo não abre, não salva ou não aparece no site.
grupo: primeiros-passos
ordem: 3
veja: primeiros-passos, glossario, auditoria
busca: erro problema duvida nao abre nao salva sessao expirada permissao sumiu lento tentar de novo mensagem campo erro do servidor valor invalido mes fechado travado curso sumiu armazenados
---

Antes de ligar para alguém, veja se o caso é um destes.

### "O sistema me jogou para a tela de login"

Sua sessão passou das 8 horas, ou passou de 24 horas desde que você entrou.
É normal. Entre de novo — o sistema volta para a tela onde você estava.

### "Uma tela sumiu do meu menu"

Menu é permissão. Se você via e parou de ver, alguém alterou a **regra de
permissão** que você usa. Fale com quem cuida dos
[administradores](?topico=administradores).

### "Apareceu 'Não foi possível carregar' / 'Tentar de novo'"

É falha de conexão ou o servidor não respondeu. O sistema já tenta sozinho mais
de uma vez antes de mostrar isso. Clique em **Tentar de novo**; se insistir,
confira sua internet e só então avise o suporte.

### "Publiquei a notícia e ela não está no site"

Confira se foi **agendada**. Notícia agendada só aparece depois da hora marcada,
e até lá o link direto diz "não encontrada". Veja [Notícias](?topico=noticias).

### "O banner não aparece"

Três motivos, nessa ordem: o período ainda **não começou** (selo *Agendado*), já
**terminou** (selo *Expirado*), ou ele está **Inativo**. Veja
[Banners](?topico=banners).

### "Não consigo marcar a sala"

A sala já está reservada naquele horário. O sistema recusa de propósito e mostra
o motivo dentro da própria janela. Escolha outro horário ou outra sala — veja
[Salas, reservas e agenda](?topico=salas-e-agenda).

### "Deu 'CPF já cadastrado para outra pessoa'"

Esse CPF já está em outra ficha. Provavelmente é um cadastro repetido: procure a
pessoa em Usuários e use **Juntar cadastros**. Veja
[Usuários e associados](?topico=usuarios).

### "A pessoa não consegue se inscrever no curso pelo site"

O site pede o **CPF e os 4 últimos números do telefone** do cadastro. Se o
telefone não bate, a pessoa cai no cadastro novo e, com o CPF já cadastrado, é
recusada com *"Procure o Sindicato"*. Atualize o telefone na ficha (há até três)
ou inscreva pelo painel. Depois de 5 erros na mesma hora com o mesmo CPF, o
site bloqueia o CPF por uma hora. Veja [Cursos e inscrições](?topico=cursos).

### "A tela mostra uma mensagem com o nome de um campo"

Quando você preenche algo que o sistema não aceita, a mensagem agora **diz o que
está errado**, em vez de um genérico "erro do servidor". Leia a mensagem, corrija
o campo citado e salve de novo.

| A mensagem diz | Quer dizer |
|---|---|
| *Informe o campo "…".* | Falta preencher esse campo |
| *Texto longo demais em "…": máximo de N caracteres.* | Encurte o texto |
| *Valor maior que o máximo em "…": N.* ou *Valor menor que o mínimo…* | O número passou do limite. Digite um valor menor (ou maior) |
| *Valor inválido em "…": esperado número.* | Você digitou letra onde era número |
| *Formato inválido em "…".* | O dado está num formato que o sistema não entende (e-mail, data…) |
| *Data inválida: use um ano entre 1900 e 2999.* ou *Data fora do intervalo aceito.* | O ano da data está errado. Confira o ano: "26" no lugar de "2026" dá esse erro |
| *Número fora do limite permitido.* | O número é grande demais |

O nome do campo às vezes aparece como o sistema o chama por dentro (por exemplo,
em inglês). Quase sempre dá para saber qual é pelo que você acabou de preencher.

Se for uma **lista** que não abre (como os Lançamentos com uma data de ano
absurdo no filtro), a própria tela mostra o motivo no lugar de "Não foi possível
carregar". Aí **Tentar de novo** não resolve: corrija o filtro.

A mensagem *Ocorreu um erro inesperado. Tente novamente.* é diferente: é falha de
verdade do sistema. Tente uma vez mais e, se continuar, avise o suporte com as
quatro informações do fim desta página.

### "Não consigo editar nem excluir um lançamento do Financeiro"

Olhe se a linha tem o selo **Mês fechado**. Quando o mês de um caixa está
fechado, os lançamentos desse caixa naquele mês ficam trancados: **Editar** e
**Excluir** desligados, e o formulário mostra uma faixa amarela. Quem tem
permissão de excluir no Financeiro reabre o mês em **Financeiro › Fechamento**
(**Reabrir mês**). Veja [Financeiro](?topico=financeiro).

### "Não acho o curso na lista"

Se o dia do início do curso já chegou, ele passou sozinho para a aba
**Armazenados**. Veja [Cursos e inscrições](?topico=cursos).

### "Perdi o que eu tinha digitado"

Se você saiu da tela, o sistema pergunta **"Sair sem salvar?"** antes. Fechar ou
atualizar a aba do navegador mostra o aviso do próprio navegador. Em nenhum dos
dois casos o texto é recuperável depois — para formulários longos, salve no
meio do caminho.

### "Alguém alterou e eu não sei quem"

[Auditoria](?topico=auditoria). Filtre por período e tipo de registro e abra a
linha: ela mostra quem foi, de onde, e **o que mudou**, campo por campo.

### Nada acima resolveu

Quando for pedir ajuda, mande estas quatro coisas — elas cortam metade das
idas e vindas:

1. Em que tela você estava (o endereço da página serve)
2. O que você clicou
3. O que apareceu na tela, de preferência com print
4. A hora aproximada
