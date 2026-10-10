# Ordenação por arrastar em exercícios e rotinas

## Objetivo

Permitir que personal e aluno coloquem exercícios de uma ficha e as rotinas de treino na ordem em que realmente serão feitas, arrastando os itens em vez de editar números.

## Contexto

- Hoje a ordem dos exercícios de uma ficha é guardada em `routine_exercises.position`, com unicidade por rotina.
- As rotinas não têm dia da semana. Alunos que separam os treinos por dia (ex.: segunda, quarta, sexta) hoje não conseguem ver nem ordenar a sequência semanal.

## Decisão de experiência

- Arrastar pela alça ao lado de cada exercício para reordenar a ficha.
- Arrastar as rotinas para reordenar a lista de treinos. Quando as rotinas tiverem dia da semana, a ordenação acontece dentro de cada dia.
- O arrastar deve funcionar com o dedo no celular (toque e arraste). API nativa de arrastar e soltar do HTML não funciona em toque no iOS, então a implementação usa eventos de ponteiro ou uma biblioteca que os use.
- Enquanto arrasta, o item fica destacado e a posição de destino aparece.
- A nova ordem é salva ao soltar, com indicação de salvando e mensagem de erro se falhar; em caso de falha a ordem anterior volta.

## Pontos em aberto

- Reordenar grava novas posições em todos os itens afetados. Como a unicidade de posição não é adiável, a troca precisa acontecer em uma única transação no banco.
- Definir se o dia da semana é campo da rotina (uma rotina por dia) ou uma nova organização que agrupa rotinas por dia.

## Critérios de aceite

- Personal e aluno conseguem reordenar os exercícios de uma ficha arrastando, no celular e no desktop.
- A ordem salva é a mesma depois de recarregar a tela e aparece para o outro lado (aluno vê a ordem do personal).
- Falha ao salvar mostra erro e restaura a ordem anterior.
- A reordenação não altera séries, cargas, notas ou o histórico de treinos já finalizados.
- O teste de banco cobre a troca de posições sem violar a unicidade e a autorização.
