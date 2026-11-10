---
titulo: Unimed
resumo: Beneficiários do plano de saúde, movimentos e documentos.
grupo: dia-a-dia
ordem: 5
permissao: READ_USER
veja: usuarios, exportar-planilhas
busca: unimed plano saude beneficiario cns titular dependente ficha termo contrato movimento
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

No fim de cada linha ficam dois ícones à vista: o lápis, **Editar**, e o da
ficha, **Gerar Ficha**. Passe o mouse sobre o ícone para ver o nome. O resto
fica no menu **Mais**, o botão **⋯** ao lado deles, com os nomes escritos:

- **Gerar Termo de adesão**;
- **Gerar Contrato (Ciência e Consentimento)**;
- **Exportar planilha**, só daquele beneficiário;
- **Excluir**, por último e em vermelho, separado por uma linha.

Os três documentos baixam em PDF. Eles também estão na aba **Unimed** da ficha
da pessoa, nos botões **Ficha**, **Termo** e **Contrato** — é o mesmo
documento, visto de dois caminhos.
