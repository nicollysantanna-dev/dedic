# Work item 0013 — Motivo de cancelamento e conclusão automática

## Resultado esperado

Preservar o contexto do cancelamento e fechar automaticamente aulas que chegaram
ao horário de término sem cancelamento ou remarcação.

## Requisitos relacionados

RF-10, RF-11, RF-13, RF-14, RF-20, RN-05, RN-06, RN-14 e RN-16.

## Critérios de aceite

- Aluno e personal podem informar observação opcional de até 300 caracteres.
- Motivo, autoria, estado e horário ficam registrados no evento de cancelamento.
- Cancelamento antes do início continua devolvendo exatamente um crédito.
- Após o início, cancelamento e remarcação continuam bloqueados.
- Ao atingir `ends_at`, uma aula ainda agendada torna-se realizada automaticamente.
- A conclusão automática cria evento auditável e não movimenta crédito novamente.
- Reexecutar o fechamento automático não duplica eventos nem altera saldo.
