# ADR 0006 — Treinos nativos com catálogo free-exercise-db

## Status

Aceita em 20/09/2026. Substitui a decisão D6 da ADR 0005.

## Contexto

A D6 previa integração opcional com o Hevy e registro manual como fallback. A
integração exigiria Hevy Pro do aluno e deixaria o registro de treino fora do
Dedic. A responsável pelo produto decidiu construir treinos nativos com a
experiência do Hevy (fichas, sessão com séries · carga · reps, descanso, histórico).

A primeira versão usou o tier gratuito do ExerciseDB (1.500 exercícios, GIFs).
Ele proíbe guardar a mídia e limita as requisições (1.000/h, URLs que rodam
semanalmente): cada miniatura era uma chamada ao vivo, então listas mostravam
iniciais em vez de imagens, e uma busca no seletor chegou a disparar 60
requisições. O custo do projeto precisa ser zero.

## Decisão

- **Catálogo**: `yuhonas/free-exercise-db` (Unlicense, domínio público): 876
  exercícios com duas imagens (posição inicial e final) e instruções. Importado
  por `scripts/import-free-exercise-db.mjs` para `supabase/seed/exercises.json`,
  traduzido à mão em `exercises.pt-BR.json` (876/876) e aplicado como migração
  de dados gerada por `scripts/build-catalog-migration.mjs`.
- **Mídia própria**: as imagens ficam no bucket público `exercise-media` do
  projeto, copiadas por `scripts/sync-exercise-media.mjs` (chave de serviço,
  idempotente). Nenhuma chamada a terceiros no app; miniatura em toda lista;
  o lightbox alterna as duas posições como animação.
- **ExerciseDB sai de cena**: linhas antigas sem referência são apagadas; as
  referenciadas por fichas/treinos recebem `retired_at` e somem da busca.
- **Exercícios próprios para todos**: aluno e personal criam exercícios
  (`exercises.owner_id`) com foto do aparelho (`exercises.photo_path`, bucket
  `exercise-photos`, pasta do próprio usuário). Visíveis ao dono e a quem tem
  vínculo ativo com ele, nas duas direções.
- **Substituir exercício** nos três pontinhos do card, na ficha (mantém notas,
  descanso e séries) e na sessão (`replace_workout_exercise`, mantém as séries).
- **Recordes derivados** (como o saldo de créditos): `exercise_records` e
  `exercise_workout_stats` são vistas sobre `workout_sets`; `finish_workout` grava
  `record_kinds` na série e `record_count` no treino, na ordem da sessão, para o
  histórico não recomputar. Meta `exercise_load` usa o melhor registro como atual.
- Hevy passa a "Could" pós-MVP (importação para `workouts`; o modelo é compatível).

## Consequências

- Zero dependência de API externa em tempo de execução; cota deixa de existir.
- 876 exercícios em vez de 1.500, com fotos estáticas em vez de GIF. A foto do
  aparelho tirada na academia cobre o que faltar.
- Instruções continuam em inglês (free-exercise-db); tradução é trabalho futuro.
- Um projeto novo precisa rodar `sync-exercise-media.mjs` após as migrações
  (ver `docs/SUPABASE_SETUP.md`).
