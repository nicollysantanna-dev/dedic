# Work item 0021 — Agendamento do personal na grade

## Problema

A criação de aula pelo personal usa uma tela antiga com campo de data/hora e cartões
de horários separados da agenda. O personal perde o contexto de ocupação ao agendar.

## Resultado esperado

Integrar a criação de aula ao mesmo calendário temporal da Agenda, exibindo aulas
existentes, horários publicados e intervalos fora da disponibilidade.

## Requisitos relacionados

- RF-05 — Bloqueios e exceções.
- RF-07 — Consulta de horários.
- RF-09 — Agendamento pelo personal.
- RN-04 — Consistência transacional.
- RNF-01 — Mobile-first.

## Critérios de aceite

- O personal escolhe um aluno vinculado antes de confirmar a aula.
- A grade oferece visões de dia, três dias e semana.
- Aulas existentes aparecem no calendário e não podem ser sobrepostas pela interface.
- Horários publicados e horários fora da disponibilidade possuem identificação visual.
- O clique seleciona um início e abre resumo antes da confirmação.
- Saldo sem créditos bloqueia a confirmação.
- Sucesso atualiza agenda, horários e saldo, com aviso visível.
- Conflito, bloqueio e saldo continuam validados atomicamente pelo banco.

## Fora do escopo

- Arrastar uma aula existente para remarcar.
- Criação de recorrência.
- Intervalos menores que trinta minutos.
