# Fechamento semanal sem cron

## Objetivo

Decidir como as semanas da constância são fechadas e como os avisos de fim de mês são enviados, sem depender de um agendador do banco, se a intenção é que tudo passe pelo web app.

## Contexto

- A migração `20261010120000_gamification_monthly_report.sql` agenda `close_weeks()` no `pg_cron` (toda segunda, 03h de Brasília).
- `close_weeks()` grava as semanas fechadas, concede as medalhas e cria o aviso de fim de mês.
- O `pg_cron` também roda `mark_overdue_payments()`, que é outra tarefa de agendamento e não está em discussão aqui.

## Opções

1. **Fechamento sob demanda.** `close_weeks()` roda sempre que alguém lê o relatório, a home ou a visão do personal (é idempotente). Os dados ficam corretos sem agendador. O custo é que o aviso de fim de mês só sai quando alguém abre o app depois do fechamento.
2. **Agendador do próprio app.** Uma função de borda (edge function) chamada por um serviço externo de cron. Mantém o horário fixo, mas adiciona infraestrutura fora do banco.
3. **Manter o `pg_cron`.** Continua sendo a opção mais simples e confiável para horário fixo e avisos. A pergunta é se ele conflita com a intenção de operar tudo pelo app.

## Recomendação inicial

Adotar a opção 1 para os dados (fechamento sob demanda, idempotente) e manter o aviso de fim de mês como efeito colateral do fechamento, aceitando que ele pode sair com atraso. Se o aviso precisar ser pontual, reavaliar a opção 2.

## Critérios de aceite

- Nenhuma semana de check-in fica sem registro depois que alguém abre o app.
- O fechamento é idempotente: ler o relatório várias vezes não duplica semanas, medalhas nem avisos.
- O aviso de fim de mês aparece uma única vez por aluno e mês.
- A decisão final é registrada em ADR antes de remover o agendamento atual.
