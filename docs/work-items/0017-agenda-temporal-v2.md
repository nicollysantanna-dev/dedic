# Work item 0017 — Agenda temporal v2

## Problema

A agenda atual usa um calendário mensal seguido por uma lista extensa. Esse formato
não permite ao personal perceber rapidamente espaços livres, conflitos e a
distribuição das aulas ao longo do dia ou da semana.

## Resultado esperado

Entregar uma agenda operacional responsiva com visões de dia, três dias e semana,
mantendo a lista detalhada e todas as operações existentes de aula.

## Requisitos relacionados

- RF-07 — Consulta de horários.
- RF-09 — Agendamento pelo personal.
- RF-10 a RF-12 — Cancelamento e remarcação.
- RF-13 e RF-14 — Estados e resultado da aula.
- RNF-01 — Mobile-first.
- RNF-05 — Acessibilidade.

## Critérios de aceite

- O personal alterna entre dia, três dias e semana.
- O período pode avançar, retroceder e retornar para hoje.
- Aulas aparecem posicionadas no dia e horário correspondentes.
- Estado e aluno são legíveis sem depender somente de cor.
- Selecionar um dia filtra os detalhes e ações exibidos abaixo da grade.
- Mobile permite percorrer a grade sem quebrar a navegação inferior.
- Carregamento, erro e vazio continuam representados.
- Agendar, remarcar, cancelar e registrar resultado permanecem acessíveis.

## Fora do escopo

- Arrastar e soltar para remarcar.
- Criar recorrência diretamente na grade.
- Sincronização com calendários externos.
- Visualização mensal temporal.
