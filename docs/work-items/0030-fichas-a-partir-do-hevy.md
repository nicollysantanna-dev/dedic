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

## Cenários de aceite (a refinar quando entrar em rodada)

- Dado um histórico do Hevy com um mesmo conjunto de exercícios repetindo em
  um dia da semana específico, quando o usuário pede para gerar fichas, então
  o Dedic propõe uma ficha por padrão detectado, com os exercícios na ordem
  mais comum observada.
- Dado um exercício da ficha gerada que já foi casado com o catálogo nativo
  na importação, quando a ficha é exibida, então a foto do catálogo aparece
  (mesmo comportamento visual de uma ficha criada manualmente).
- Dado um exercício sem correspondência clara (virou `custom` na importação),
  quando a ficha é gerada, então ele aparece sem foto, do mesmo jeito que um
  exercício `custom` criado manualmente sem foto do aparelho.
- Dado que o usuário já tem uma ficha gerada anteriormente para o mesmo
  padrão, quando o histórico é sincronizado de novo (ver 0029) e o padrão se
  mantém, então a ficha existente é **atualizada**, nunca duplicada.

## Fora do escopo (a confirmar)

- Detectar padrões complexos de periodização (ex.: mesociclos, progressão de
  carga programada) — a v1 é só "o que se repete costuma virar ficha".
- Editar a ficha gerada automaticamente sem passar pelo Editor de Rotina já
  existente — a geração só cria/atualiza; a edição continua manual.

## Perguntas em aberto (resolver antes de detalhar o plano)

- Como decidir "isso é o mesmo padrão de antes" para evitar duplicar fichas a
  cada geração — por nome do treino no Hevy (`title`), por conjunto de
  `exercise_template_id`s, ou por dia da semana observado? Precisa de uma
  chave estável para upsert, análoga ao `hevy_workout_id` da importação de
  treinos.
- A geração é automática (dispara sozinha após X sincronizações) ou sob
  demanda (botão "Gerar fichas a partir do meu histórico")? Dado que ADR 0007
  já trata o Hevy como estritamente opcional e o usuário decide quando agir,
  a favorita inicial é sob demanda.
- O personal do aluno participa dessa geração (revisa/aprova a ficha antes de
  valer) ou ela fica disponível direto para o aluno, como o histórico
  importado já fica hoje?

## Verificação

- [ ] Perguntas em aberto respondidas e plano detalhado antes de implementar
- [ ] Critérios de aceite atendidos
- [ ] Layout validado em celular
- [ ] Fichas geradas não duplicam em sincronizações repetidas
- [ ] Testes adicionados
- [ ] Quality gate executado
