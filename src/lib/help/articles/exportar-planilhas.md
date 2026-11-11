---
titulo: Exportar planilhas
resumo: Tirar as listas do painel em planilha (CSV) ou PDF, e o que fica registrado.
grupo: dia-a-dia
ordem: 7
veja: montar-relatorio, busca-e-filtros, auditoria, usuarios, cursos, financeiro
busca: exportar csv excel planilha baixar relatorio pdf lista selecionados download montar colunas campos telefone formatado 4,5e+10 padrao como hoje auditoria registrado exportou a planilha exportou o relatorio em pdf numero n anterior ordem lancamentos financeiro
---

Toda lista do painel exporta em planilha. O botão **Exportar** fica no topo da
lista, e cada linha também tem um ícone de download para levar só aquele
registro.

## As três formas de exportar

| Opção | O que leva |
|---|---|
| **Selecionados (N)** | Só as linhas que você marcou na caixinha |
| **Todos com os filtros atuais** | Tudo o que o filtro de agora mostra — não só a página na tela |
| Ícone na linha | Aquele registro sozinho |

A diferença entre a primeira e a segunda é a que mais confunde: **"Todos" não é
"o banco inteiro"**, é tudo o que casa com os filtros que você deixou ligados.
Se quiser mesmo tudo, limpe os filtros antes.

**Cursos** tem uma exceção: a planilha respeita a busca, mas **não a aba**
(*Próximos* ou *Armazenados*) **nem o filtro de Ano**. Para levar só alguns
cursos, marque-os na lista e use **Selecionados**.

A seleção **continua valendo quando você troca de página** — dá para marcar
cinco pessoas na página 1, ir à página 3, marcar mais três e exportar as oito.
O contador no topo mostra "8 selecionados · Limpar".

## Escolher as colunas

Os itens **Selecionados** e **Todos** do menu tiram a planilha com **todas as
colunas de sempre**. Em
**Pessoa física**, **Associados** e nas **Inscrições** de um curso, o menu tem
no fim o item **Montar relatório…**: você escolhe os campos e a ordem das
colunas, parte de um modelo pronto (*Nome e CPF*, *Nome e e-mail*, *Lista de
presença*…) e baixa em planilha ou PDF, ou imprime. O passo a passo está em
[Como montar um relatório](?topico=montar-relatorio).

Nas outras listas, por enquanto, a planilha sai sempre com todas as colunas.

## O arquivo

É um **CSV que abre direto no Excel**, com acentuação correta. Se abrir no
Google Planilhas, escolha ponto e vírgula como separador.

No mesmo menu, a parte **Relatório em PDF (para imprimir)** tira a lista em PDF,
só com as colunas principais, as que cabem na folha. Para escolher quais colunas vão
no PDF, use o **Montar relatório…**.

**O telefone sai como foi digitado no cadastro.** Se ele foi digitado só com
números, o Excel pode transformá-lo num número como *4,5E+10*. No
**Montar relatório…** o telefone sai formatado, como *(44) 99999-8888*, em
todos os modelos. Isso vale também para o **Padrão (como hoje)**: ele tem as
mesmas colunas da planilha de sempre, na mesma ordem, mas o telefone sai
formatado. Se o Excel estragar o telefone da planilha rápida, monte o relatório
com o **Padrão (como hoje)**.

## Onde tem

Pessoa física e Associados, Empresas, Administradores, Unimed, Cursos,
Inscrições de um curso (botão **Planilha**), Mensagens, Auditoria, Financeiro e
as reservas da agenda. Também há exportação no detalhe de uma pessoa, de uma
empresa, de um curso e de uma mensagem.

A planilha do **Financeiro** (botão **Exportar CSV**, na aba **Lançamentos**)
começa pela coluna **Nº**, o número do lançamento, e traz também **Nome / Razão
social**, **CNPJ / CPF** e **Nº anterior**. O nome vem do campo do formulário; o
CNPJ ou CPF e o Nº anterior, da Nota de Empenho — vazios quando o lançamento não
tem. As linhas saem **na mesma ordem da tela**: se a lista está em **Ordenar
por › Nº**, a planilha também. Veja [Financeiro](?topico=financeiro).

## O que fica registrado

A exportação fica registrada na [Auditoria](?topico=auditoria), com o nome de
quem baixou e quando — tanto a do menu quanto a do **Montar relatório…** e a
do ícone da linha. Há exceções, listadas logo abaixo. Isso não é para pegar
ninguém — é porque a planilha leva dados pessoais para fora do sistema, e o
Sindicato precisa saber por onde eles andaram.

Nas exportações de **Pessoas** e de **Inscrições**, a linha da Auditoria mostra
também **o que foi exportado**: o formato, o modelo, os campos, o que entrou
(selecionados ou todos), os filtros e quantos registros. A frase da linha cita
os dados pessoais que saíram, e por isso **a busca da Auditoria por *CPF* acha
quem exportou CPF**. Nas outras listas, a linha diz só qual lista foi e
quantos registros.

Em Pessoas e Inscrições, a frase diz também em que formato a lista saiu:

- planilha: *Exportou a planilha "Pessoas: 3 registros (todos) · CSV · com CPF"*;
- PDF do **Montar relatório…**, baixado ou pelo **Imprimir**: *Exportou o relatório em PDF "Pessoas: 4 registros (com filtros) · PDF · com CPF"*.

Nas outras listas, a frase é sempre *Exportou a planilha "…"*.

> O **Relatório em PDF** rápido do menu (sem montar) aparece na Auditoria como
> planilha: *Exportou a planilha "… · CSV"*, com o formato **Planilha CSV**. É
> que ele é montado no seu navegador a partir da planilha. Só o PDF do
> **Montar relatório…** aparece como PDF.

**Ainda não ficam registrados:**

- a planilha do **Financeiro** (**Exportar CSV**);
- os documentos que o navegador monta sozinho: a **Lista de presença** e as
  fichas de inscrição do curso, os documentos da Unimed, a Nota de Empenho, o
  recibo, os PDFs do Financeiro e a impressão da agenda;
- o **Copiar telefones** e o **Copiar e-mails** das inscrições.

A planilha do Financeiro e esses documentos passam a ser registrados numa
próxima atualização do sistema.

## A planilha é sua responsabilidade

**A planilha sai do sistema e vira sua responsabilidade.** Ela tem CPF,
telefone e endereço de associados. Não mande por grupo de WhatsApp, não deixe na
área de trabalho de um computador compartilhado e apague quando terminar o que
precisava. Melhor ainda: com o **Montar relatório…**, leve só as colunas de que
a tarefa precisa.
