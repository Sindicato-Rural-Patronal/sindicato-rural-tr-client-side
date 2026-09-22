---
titulo: Unimed
resumo: Beneficiários do plano de saúde, movimentos e documentos.
grupo: dia-a-dia
ordem: 5
permissao: READ_USER
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

Cada linha tem o menu **Ações**, com os rótulos escritos, que baixa em PDF:

- **Ficha**
- **Termo**
- **Contrato**

Os mesmos documentos estão na aba **Unimed** da ficha da pessoa — é o mesmo
lugar, visto de dois caminhos.
