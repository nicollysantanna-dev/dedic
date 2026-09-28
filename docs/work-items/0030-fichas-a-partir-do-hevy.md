# Gerar ficha (rotina) a partir do histórico importado do Hevy

## Resultado esperado

Um usuário que já importou seu histórico do Hevy consegue, a partir do padrão
recorrente desse histórico (ex.: "Quarta: Peito + Tríceps" repetindo toda
semana), gerar uma ficha nativa do Dedic pronta para usar — em vez de recriar
manualmente no Editor de Rotina o que ele já treina há meses no Hevy. Os
exercícios da ficha gerada, quando já têm correspondência no catálogo nativo
(via `hevy_exercise_template_map`, criado pela importação), herdam a foto
existente do catálogo em vez de ficarem sem imagem.

## Requisitos relacionados

- ADR 0007 (decisão de escopo do Hevy; seção "Trabalho futuro").
- ADR 0006 (catálogo nativo `free-exercise-db`, fotos por exercício,
  exercícios `custom` com foto do próprio usuário).
- `import_hevy_workout`/`match_or_create_hevy_exercise`
  (`supabase/migrations/20260923122000_hevy_exercise_matching.sql`,
  `20260923123000_hevy_workout_import.sql`) — já resolvem exercício→catálogo
  na importação; esta feature reaproveita esse casamento, não recria.
- `src/features/workouts/routine-model.ts`, `RoutineEditorPage.tsx`,
  `routine-queries.ts` — modelo de ficha nativo já existente, que esta feature
  passa a alimentar automaticamente além da criação manual.

## Cenários de aceite

- Dado um nome de treino que se repete 2+ vezes no histórico (nativo ou
  importado do Hevy — tanto faz, `generate_routines_from_history` não sabe
  nem precisa saber a origem), quando a aluna clica "Gerar fichas", então uma
  ficha é criada com os exercícios e séries da sessão **mais recente** com
  aquele nome.
- Dado um exercício da ficha gerada que já foi casado com o catálogo nativo
  na importação (`exercise_id` já resolvido em `workout_exercises`), quando a
  ficha é exibida, então a foto do catálogo aparece (mesmo comportamento
  visual de uma ficha criada manualmente — nenhum código novo de exibição foi
  necessário).
- Dado um exercício sem correspondência clara (virou `custom` na
  importação), quando a ficha é gerada, então ele aparece sem foto, do mesmo
  jeito que um exercício `custom` criado manualmente sem foto do aparelho.
- Dado que a aluna já tem uma ficha gerada anteriormente para o mesmo nome de
  treino, quando ela clica "Gerar fichas" de novo, então a ficha existente é
  **atualizada** (reflete a sessão mais recente), nunca duplicada.
- Dado que a aluna arquivou manualmente uma ficha gerada anteriormente,
  quando ela clica "Gerar fichas" de novo, então essa ficha **não** é
  recriada nem desarquivada — a geração respeita a decisão já tomada.

## Fora do escopo

- Detectar padrões complexos de periodização (ex.: mesociclos, progressão de
  carga programada) — a v1 é só "o que se repete 2x+ vira ficha, molde é a
  sessão mais recente".
- Editar a ficha gerada automaticamente sem passar pelo Editor de Rotina já
  existente — a geração só cria/atualiza; a edição continua manual.
- Geração automática após sincronizar — só sob demanda, botão dedicado.
- Revisão/aprovação do personal antes da ficha valer para a aluna.

## Perguntas em aberto — respondidas em 2026-09-27

- **Identidade do padrão**: pelo nome do treino (`workouts.name`, via
  `btrim`) — mais simples e previsível do que agrupar por conjunto de
  exercícios ou por dia da semana, e já é como a aluna organiza os treinos no
  Hevy hoje. Chave de upsert: `generated_routine_sources (student_id,
source_name) → routine_id`.
- **Gatilho**: só sob demanda, botão "Gerar fichas" em Treinos → Fichas.
- **Papel do personal**: nenhuma revisão — a ficha fica disponível direto
  para a aluna, mesmo padrão do histórico importado. O personal já pode
  editá-la depois via edição compartilhada de fichas, como qualquer outra.

## Verificação

- [x] Perguntas em aberto respondidas e plano detalhado antes de implementar
- [x] Critérios de aceite atendidos
- [ ] Layout validado em celular — pendente de conferência visual real (ver
      `docs/work-items/0031-auditoria-mobile-pos-hevy.md`)
- [x] Fichas geradas não duplicam em sincronizações repetidas
- [x] Testes adicionados (12 pgTAP em
      `supabase/tests/101_generate_routines_from_history.sql`, 4 Testing
      Library em `GenerateRoutinesFromHistoryButton.test.tsx`)
- [x] Quality gate executado (`format:check`, `lint`, `typecheck`, `test`,
      `test:db`, `test:e2e`, `build`)
