# Work item 0016 — Fundação visual e dashboard v2

## Problema

A aplicação autenticada não possui uma navegação persistente nem hierarquia visual
compatível com a nova proposta de gestão completa. A agenda ocupa a home, mas tarefas,
indicadores e alertas do dia não formam um dashboard operacional.

## Resultado esperado

Entregar o primeiro corte da Fase 1 com shell responsivo, tokens visuais e dashboard
do personal usando dados existentes, sem alterar regras transacionais.

## Requisitos relacionados

- RF-19 — Página inicial do personal.
- RF-21 — Dashboard operacional do personal.
- RNF-01 — Mobile-first.
- RNF-05 — Acessibilidade.

## Critérios de aceite

- Desktop possui sidebar com as cinco áreas aprovadas.
- Mobile possui navegação inferior sem rolagem horizontal.
- A rota inicial do personal mostra agenda do dia antes dos indicadores.
- Estados de aula possuem texto e cor, sem depender somente da cor.
- Carregamento, erro e vazio permanecem representados.
- Rotas e operações existentes continuam acessíveis durante a migração.

## Fora do escopo

- Nova persistência de metas, peso e fotos.
- Integração Hevy.
- Substituição final da agenda por biblioteca temporal.
- Remoção das rotas antigas.
