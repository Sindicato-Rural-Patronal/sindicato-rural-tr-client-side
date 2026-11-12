---
titulo: Unimed
resumo: Beneficiários do plano de saúde, movimentos e documentos.
grupo: dia-a-dia
ordem: 5
permissao: READ_USER
veja: usuarios, exportar-planilhas, montar-relatorio
busca: unimed plano saude beneficiario cns titular dependente ficha termo contrato movimento exportar planilha montar relatorio nome cpf e plano gerar ficha gerar termo de adesao gerar contrato ciencia e consentimento excel xlsx auditoria gerou o documento documento nao foi gerado muitos documentos seguidos erro ao gerar a ficha erro ao gerar o termo erro ao gerar o contrato
---

**Gestão › Unimed** guarda os beneficiários do plano de saúde. É um cadastro de
apoio: a pessoa já precisa existir em [Usuários](?topico=usuarios).

## Preenchendo

- **Tipo de movimento** e **grau de dependência** são listas fechadas. Se um
  cadastro antigo tiver um valor fora da lista, ele continua aparecendo marcado
  como **(valor antigo)** e o sistema aceita você salvar assim — mas, se for
  corrigir, escolha um valor da lista.
- **CNS** tem 15 dígitos e a máscara `000 0000 0000 0000`. Digite só os números.
- **Plano** é texto livre (o cadastro antigo só tinha o nome e o registro ANS).
- O **titular vinculado** mostra o nome da pessoa do cadastro.

## Documentos

Cada linha tem o menu **Ações**, com os rótulos escritos. Os três primeiros
itens baixam um documento em PDF:

- **Gerar Ficha**
- **Gerar Termo de adesão**
- **Gerar Contrato (Ciência e Consentimento)**

Os mesmos documentos estão na aba **Unimed** da ficha da pessoa, nos botões
**Ficha**, **Termo** e **Contrato** — é o mesmo lugar, visto de dois caminhos.

**Cada documento fica registrado na [Auditoria](?topico=auditoria)**, com o
nome da pessoa e os dados que ele leva: *Gerou o documento "Ficha da Unimed:
MARIA DA SILVA · 1 registro · com CPF, …"*. O registro é feito antes de o PDF
ser gerado. Se ele falhar, o documento não sai e aparece uma mensagem (veja
[Se algo der errado](#se-algo-der-errado)). Os documentos levam CPF, RG e o
plano de saúde: trate o PDF com o mesmo cuidado de uma planilha.

## Exportar

O botão **Exportar**, no topo, leva os beneficiários da busca, ou só os
marcados, em planilha (CSV ou Excel) ou PDF. No fim do menu, o **Montar
relatório…** deixa escolher as colunas: o modelo **Nome, CPF e plano** leva só
essas três. O **Plano** e o **CNS** são dados sensíveis, porque falam de saúde:
o montador avisa antes de baixar. Veja
[Como montar um relatório](?topico=montar-relatorio).

O **Exportar planilha** do menu **Ações** leva só aquele beneficiário, em CSV.
Na planilha do Excel, o CNS sai como texto e não vira número. Veja
[Exportar planilhas](?topico=exportar-planilhas).

## Se algo der errado

| O que aparece ao gerar a Ficha, o Termo ou o Contrato | O que fazer |
|---|---|
| *O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.* | O documento não sai sem ficar na Auditoria, e o registro falhou. Confira a internet e clique de novo |
| *Muitos documentos seguidos. Aguarde um minuto e tente de novo.* | Passou de 30 documentos num minuto, somando todo mundo que usa a mesma internet. Espere um minuto e clique de novo |
| *Você não tem permissão para gerar este documento.* | A sua regra não deixa gerar os documentos da Unimed. Fale com quem cuida das regras |
| *Erro ao gerar a Ficha.*, *Erro ao gerar o Termo de adesão.* ou *Erro ao gerar o Contrato.* | Clique de novo. Se continuar, avise o suporte (veja [Problemas comuns](?topico=problemas-comuns)) |
