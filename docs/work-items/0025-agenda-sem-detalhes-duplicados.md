# 0025 — Agenda sem detalhes duplicados

## Objetivo

Reduzir a poluição visual da agenda, mantendo a grade semanal como interface principal.

## Decisão

- Remover o bloco `Detalhes do dia` exibido abaixo do calendário.
- Clicar em uma aula continua abrindo o painel contextual sobre a agenda.
- Remarcação, cancelamento, registro de resultado e correção permanecem disponíveis no
  painel contextual.
- O calendário continua sendo a fonte visual única para consultar aulas e horários.

## Critérios de aceite

- A agenda não repete as aulas em cartões abaixo da grade.
- O evento do calendário continua abrindo os detalhes da aula.
- Ações permitidas pelo estado da aula continuam acessíveis no painel.
- O layout permanece utilizável em celular e desktop.
