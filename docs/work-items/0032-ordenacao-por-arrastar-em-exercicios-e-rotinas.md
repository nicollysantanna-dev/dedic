# Ordenação por arrastar em fichas e exercícios

## Objetivo

Permitir que aluno e personal deixem as fichas e os exercícios de cada ficha na ordem que preferirem, arrastando para cima e para baixo. A ordem é livre: não há agrupamento por dia da semana (quem usa "Segunda", "Terça" no nome da ficha ordena arrastando).

## Contexto

- A ordem dos exercícios de uma ficha já é guardada em `routine_exercises.position`, com unicidade por ficha.
- As fichas não têm campo de ordem: a lista segue `created_at`. Por isso fichas criadas fora de ordem (ex.: "Sexta" antes de "Terça") aparecem embaralhadas.

## Decisão de experiência

- Na lista de fichas (Treinos → Fichas), cada ficha tem uma alça de arrastar para mudar a posição.
- No editor da ficha, cada exercício tem uma alça para subir ou descer na lista.
- Funciona com o dedo no celular e com o mouse no desktop. A API nativa de arrastar e soltar do HTML não funciona em toque no iOS, então a implementação usa eventos de ponteiro (ou biblioteca que os use).
- Enquanto arrasta, o item fica destacado e a posição de destino aparece. A ordem é salva ao soltar, com indicação de salvando; se falhar, mostra erro e volta a ordem anterior.
- Alternativa acessível ao arrastar: botões "subir" e "descer" no teclado e leitor de tela.

## Pontos técnicos

- Nova coluna de posição nas fichas, por dono da lista, preenchida com a ordem atual (`created_at`) na migração.
- Reordenar grava as novas posições de todos os itens afetados em uma única transação no banco, para não violar a unicidade da posição.
- Aluno e personal com vínculo ativo podem reordenar as fichas compartilhadas, com a mesma autorização que já vale para editar a ficha.

## Critérios de aceite

- Aluno e personal reordenam fichas e exercícios arrastando, no celular e no desktop.
- A ordem salva continua igual depois de recarregar e aparece igual para o outro lado.
- Falha ao salvar mostra erro e restaura a ordem anterior.
- Reordenar não altera séries, cargas, notas nem o histórico de treinos finalizados.
- Teste de banco cobre a troca de posições (sem violar unicidade) e a autorização.

## Estado da implementação

- Feito: alça de arrastar nas fichas (lista do aluno e do personal), nos exercícios do editor e nas séries de cada exercício.
- Verificado no navegador em 390 px: toque simulado e mouse (fichas, exercícios e séries) e teclado (espaço e setas) nas fichas.
- Fichas: a nova ordem aparece na hora e é salva ao soltar; se falhar, aparece mensagem e a lista volta à ordem salva.
- Exercícios e séries: a ordem é salva pelo botão **Salvar** do editor (fluxo que já existia), não ao soltar.
- Banco: migração `20261011120000_routine_ordering.sql` (coluna `position`, fichas novas no topo, função `reorder_routines`) e teste `170_routine_ordering.sql` (8 asserções).
- Dependências novas: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Teste automatizado: `tests/e2e/routine-ordering.spec.ts` (arrastar com mouse e reordenar pelo teclado, no desktop e no celular). Avisos para leitor de tela em português.
