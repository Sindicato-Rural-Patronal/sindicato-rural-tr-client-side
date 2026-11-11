---
titulo: Exportar planilhas
resumo: Tirar as listas do painel em planilha (CSV) ou PDF, e o que fica registrado.
grupo: dia-a-dia
ordem: 7
veja: montar-relatorio, busca-e-filtros, auditoria, usuarios, cursos, financeiro
busca: exportar csv excel planilha baixar relatorio pdf lista selecionados download montar colunas campos telefone formatado 4,5e+10 padrao como hoje auditoria registrado exportou a planilha exportou o relatorio em pdf numero n anterior ordem lancamentos financeiro resumo resumido resumida folha em pe deitada 2.000 linhas aba ano proximos armazenados relatorio de cadastros copiar telefones copiar e-mails
---

Toda lista do painel exporta em planilha. O botão **Exportar** fica no topo da
lista (nas inscrições de um curso, ele se chama **Planilha**). Em várias listas,
cada linha também tem um ícone de download, para levar só aquele registro.

## As três formas de exportar

| Opção | O que leva |
|---|---|
| **Selecionados (N)** | Só as linhas que você marcou na caixinha |
| **Todos com os filtros atuais** | Tudo o que o filtro de agora mostra — não só a página na tela |
| Ícone na linha | Aquele registro sozinho |

A diferença entre a primeira e a segunda é a que mais confunde: **"Todos" não é
"o banco inteiro"**, é tudo o que casa com os filtros que você deixou ligados.
Se quiser mesmo tudo, limpe os filtros antes. Sem filtro ligado, o item se
chama só **Todos**, com o total entre parênteses.

Nos **Cursos**, o filtro inclui a aba aberta (**Próximos** ou **Armazenados**) e
o **Ano**: o **Todos (N)** leva o mesmo número de cursos que a tela mostra.

A seleção **continua valendo quando você troca de página** — dá para marcar
cinco pessoas na página 1, ir à página 3, marcar mais três e exportar as oito.
O contador no topo mostra "8 selecionados · Limpar".

Algumas listas não têm seleção: as **Inscrições** de um curso, a **Auditoria**
e os **Lançamentos** do Financeiro. Nelas o menu só tem **Todos**. Na agenda das
salas, o menu é outro: **Este dia** ou **Esta semana** (o período da tela) e
**Escolher período…**.

## Escolher as colunas

Os itens **Selecionados** e **Todos** do menu tiram a planilha com **todas as
colunas de sempre**. Toda lista tem, no fim do menu, o item **Montar
relatório…**: você escolhe os campos e a ordem das colunas, parte de um modelo
pronto (*Nome e CPF*, *Lista de presença*, *Calendário*…) e baixa em planilha ou
PDF, ou imprime. As fichas de pessoa e de empresa também têm. O passo a passo
está em [Como montar um relatório](?topico=montar-relatorio).

Só o **Relatório de cadastros**, no topo de **Gestão › Usuários**, sai sempre
com todas as colunas.

## O arquivo

É um **CSV que abre direto no Excel**, com acentuação correta. Se abrir no
Google Planilhas, escolha ponto e vírgula como separador.

**O telefone sai como foi digitado no cadastro.** Se ele foi digitado só com
números, o Excel pode transformá-lo num número como *4,5E+10*. No
**Montar relatório…** o telefone sai formatado, como *(44) 99999-8888*, em
todos os modelos. Isso vale também para o **Padrão (como hoje)**: ele tem as
mesmas colunas da planilha de sempre, na mesma ordem, mas o telefone sai
formatado. Se o Excel estragar o telefone da planilha rápida, monte o relatório
com o **Padrão (como hoje)**.

## O PDF rápido do menu

No mesmo menu, a parte **Relatório em PDF (para imprimir)** tira a lista em PDF,
só com as colunas principais, as que cabem na folha. É o modelo **Resumo**:

- no alto, embaixo do título, vem a linha *Modelo: Resumo · Filtros: …* (com
  linhas marcadas, *Modelo: Resumo · Seleção: 8 registros*);
- com até 5 colunas, a folha sai em pé;
- o telefone sai formatado, como *(44) 99999-8888*.

Nos **Lançamentos** do Financeiro e na **Auditoria**, o modelo é outro:

- Lançamentos: **Resumido**, com Nº, Data, Descrição, Nome / Razão social e
  Valor (R$);
- Auditoria: **Resumida**, com Data e hora, Quem, Ação e Alvo.

**Acima de 2.000 linhas, o PDF rápido sai do jeito antigo**: montado no seu
navegador a partir da planilha, com a folha deitada e sem a linha de modelo e
filtros. As colunas são as mesmas.

Para escolher as colunas do PDF, use o **Montar relatório…**. O PDF dele aceita
até 2.000 linhas; acima disso, baixe a planilha ou filtre a lista.

## Onde tem

- **Gestão › Usuários**: abas **Pessoa física** e **Associados** (com
  **Propriedades dos selecionados**), **Pessoa jurídica** (com **Propriedades
  das selecionadas**) e **Administradores**. No topo, o **Relatório de
  cadastros**, para quem vê administradores.
- **Gestão › Cursos** (com **Inscrições dos cursos selecionados** e
  **Inscrições de todos os cursos**) e as **Inscrições** de um curso (botão
  **Planilha**).
- **Gestão › Unimed**, **Gestão › Mensagens** e **Gestão › Auditoria**.
- **Financeiro**, aba **Lançamentos**.
- A agenda das salas, no **Painel Geral**: só as reservas (eventos e reuniões).
  Os cursos não entram.

Também há exportação no detalhe de uma pessoa (**Ficha completa** e
**Propriedades**), de uma empresa (**Dados da empresa** e **Propriedades**), de
um curso e de uma mensagem.

A planilha dos **Lançamentos** (botão **Exportar**, na aba **Lançamentos** do
Financeiro) começa pela coluna **Nº**, o número do lançamento, e traz também
**Nome / Razão social**, **CNPJ / CPF** e **Nº anterior**. O nome vem do campo
do formulário; o CNPJ ou CPF e o Nº anterior, da Nota de Empenho — vazios
quando o lançamento não tem. As linhas saem **na mesma ordem da tela**: se a
lista está em **Ordenar por › Nº**, a planilha também. Veja
[Financeiro](?topico=financeiro).

## O que fica registrado

Toda exportação fica registrada na [Auditoria](?topico=auditoria), com o nome
de quem baixou e quando: a do menu, a do **Montar relatório…**, a do ícone da
linha, a das fichas e a planilha dos **Lançamentos**. Há exceções, listadas
logo abaixo. Isso não é para pegar ninguém — é porque a planilha leva dados
pessoais para fora do sistema, e o Sindicato precisa saber por onde eles
andaram.

A linha da Auditoria mostra também **o que foi exportado**: o formato, o
modelo, os campos, o que entrou (selecionados ou todos), os filtros e quantos
registros. A frase da linha cita os dados pessoais que saíram, e por isso **a
busca da Auditoria por *CPF* acha quem exportou CPF**. Só o **Relatório de
cadastros** não tem esse detalhe: a linha diz o nome do relatório e quantos
registros.

A frase diz também em que formato a lista saiu:

- planilha: *Exportou a planilha "Pessoas: 3 registros (todos) · CSV · com CPF"*;
- PDF, do **Montar relatório…** (baixado ou pelo **Imprimir**) ou do
  **Relatório em PDF** do menu: *Exportou o relatório em PDF "Pessoas: 4
  registros (com filtros) · PDF · com CPF"*.

> Dois PDFs aparecem na Auditoria como planilha (*Exportou a planilha "… ·
> CSV"*): o **Relatório em PDF** do menu acima de 2.000 linhas e o PDF do
> **Relatório de cadastros**. Os dois são montados no seu navegador a partir da
> planilha.

**Ainda não ficam registrados:**

- os documentos que o navegador monta sozinho: a **Lista de presença** e as
  fichas de inscrição do curso, os documentos da Unimed (**Ficha**, **Termo** e
  **Contrato**), a Nota de Empenho, o recibo, o **Baixar PDF** e o **Relatório
  de despesas** do Financeiro e o **Imprimir** da agenda;
- o **Copiar telefones** e o **Copiar e-mails** das inscrições.

## A planilha é sua responsabilidade

**A planilha sai do sistema e vira sua responsabilidade.** Ela tem CPF,
telefone e endereço de associados. Não mande por grupo de WhatsApp, não deixe na
área de trabalho de um computador compartilhado e apague quando terminar o que
precisava. Melhor ainda: com o **Montar relatório…**, leve só as colunas de que
a tarefa precisa.
