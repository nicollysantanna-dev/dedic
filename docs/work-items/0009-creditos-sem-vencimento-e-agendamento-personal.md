# Unidade de trabalho — Créditos sem vencimento e agendamento pelo personal

## Resultado esperado

Créditos permanecem disponíveis após a data prevista de renovação e o personal
consegue agendar diretamente para um aluno vinculado.

## Requisitos relacionados

- RF-08, RF-09 e RF-15
- RN-03, RN-04, RN-11, RN-12 e RN-14

## Cenários de aceite

- Novo pacote acumula créditos mesmo quando já existe outro pacote ativo.
- Data prevista de renovação não bloqueia agendamento nem zera saldo.
- Consumo utiliza primeiro o pacote ativo mais antigo com crédito.
- Personal escolhe aluno e horário, consumindo exatamente um crédito.
- Autoria do agendamento identifica o personal.

## Verificação

- [x] Regras e documentação atualizadas
- [x] Migração aplicada no banco remoto
- [x] Cenário transacional demonstrado com rollback
- [x] Layout mobile validado
- [x] Quality gate executado
