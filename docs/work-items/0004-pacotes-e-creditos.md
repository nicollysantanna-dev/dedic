# Unidade de trabalho — Pacotes e créditos

## Resultado esperado

O personal cria e ativa pacotes, e ambas as partes consultam um saldo explicável por
um extrato imutável.

## Requisitos relacionados

- RF-06, RF-15 e RF-16
- RN-03, RN-10, RN-11, RN-13 e RN-14
- RNF-01, RNF-02 e RNF-03

## Cenários de aceite

- Dado um pacote em rascunho, quando o personal o ativa, então a ativação e a entrada
  integral de créditos são gravadas na mesma transação.
- Dado um saldo, quando um ajuste é registrado, então um novo lançamento justificado
  altera o saldo sem editar o histórico.
- Dado um ajuste negativo superior ao saldo válido, quando o personal confirma,
  então a operação é rejeitada.
- Dado um pacote ativo cancelado, quando o cancelamento ocorre, então os créditos
  restantes são compensados e os lançamentos anteriores permanecem.
- Dado um usuário externo ao vínculo, quando consulta pacote ou extrato, então a RLS
  nega o acesso.

## Fora do escopo

- Consumo de créditos por agendamento, introduzido no Marco 5.
- Pagamentos, introduzidos no Marco 8.
- Transferência de créditos vencidos para uma renovação futura.

## Impacto previsto

### Interface

- Área de pacotes e extrato acessível pelo painel.
- Criação, ativação, cancelamento e ajuste para o personal.
- Consulta compartilhada de saldo, pacote e extrato para o aluno.

### Domínio e banco

- `lesson_packages` com estados e validade.
- `credit_transactions` imutável.
- Funções transacionais de ativação, cancelamento, ajuste e consulta de saldo.

### Segurança e privacidade

- Apenas o personal vinculado cria e administra pacotes e ajustes.
- Personal e aluno envolvidos podem consultar os mesmos registros.
- Nenhum papel recebe permissão de atualizar ou excluir lançamentos.

### Testes

- Unitários: datas do pacote e justificativa de ajuste.
- Banco/integração: funções, RLS, imutabilidade e saldo no Supabase remoto.
- E2E: navegação responsiva da área financeira.

## Riscos e casos extremos

- Concorrência: bloqueio transacional por aluno protege ajustes simultâneos.
- Repetição/idempotência: índice único permite uma ativação por pacote.
- Datas e fuso: datas civis persistidas como `date`; vencidos não compõem saldo válido.
- Falha intermediária: ativação/cancelamento e extrato pertencem à mesma transação.

## Verificação

- [x] Estados de carregamento, vazio e erro tratados
- [x] Testes adicionados
- [x] Migração aplicada e acesso anônimo rejeitado pelas funções no banco remoto
- [x] Layout validado em celular
- [x] Quality gate executado
- [x] Documentação atualizada
- [ ] Critérios de aceite demonstrados de ponta a ponta
