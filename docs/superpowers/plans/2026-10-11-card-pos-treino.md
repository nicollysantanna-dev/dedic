# Card compartilhável pós-treino — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao finalizar um treino, o aluno compartilha um card do treino; com conquista (medalha nova, semana batida ou recorde que supera marca anterior) o card abre sozinho. A meta semanal padrão passa de 3 para 5.

**Architecture:** Uma RPC `workout_summary(target_workout_id)` calcula números e conquistas no banco. No app, regras puras (`workout-share.ts`) decidem título, linha de conquistas e abertura automática; um componente de compartilhamento usa o card 1080×1920 e as funções `renderCardBlob`/`deliverCard` já existentes.

**Tech Stack:** Postgres/Supabase (plpgsql, pgTAP), React 19 + TypeScript, TanStack Query, Zod, html-to-image, Vitest + Testing Library, Playwright (verificação manual).

**Spec:** `docs/superpowers/specs/2026-10-11-card-pos-treino-design.md`

## Global Constraints

- Interface em português; código em inglês (AGENTS.md).
- Mobile-first: validar em 390 px sem rolagem horizontal.
- Regras críticas no banco; RPC `security definer`, `set search_path = ''`, `revoke ... from public, anon`, `grant execute ... to authenticated`.
- Datas do check-in no fuso `America/Sao_Paulo`, dia pelo `started_at` do treino (mesma regra de `student_check_ins`).
- Card: PNG 1080×1920, sem lista de exercícios, peso corporal, fotos ou dados do personal além da marca.
- Prioridade do título: `MEDALHA NOVA!` > `SEMANA BATIDA!` > `RECORDE!`; sem conquista `TREINO FEITO`.
- Meta padrão: 5 (só sem meta de frequência ativa); semanas já fechadas não mudam.
- Quality gate: `npm run format:check`, `lint`, `typecheck`, `test`, `build`; banco: `npm run test:db`.

## Review Focus

1. Treino num dia que já tinha aula concluída ou outro treino → `met_now = false` (não comemora duas vezes). Teste no Task 1.
2. Exercício feito pela primeira vez gera `record_count > 0`, mas `records = 0` no resumo. Teste no Task 1.
3. Treino finalizado pelo personal → sem card automático e sem botão para o personal. Teste no Task 3.
4. Aluno com meta de frequência ativa (ex.: 4) → `target = 4`, não 5. Teste no Task 1.
5. RPC falha → o resumo atual continua visível, sem card e sem botão, com aviso discreto. Teste no Task 3.

---

### Task 1: Banco — meta padrão 5 e `workout_summary`

**Files:**

- Create: `supabase/migrations/20261011140000_workout_summary_and_default_target.sql`
- Create: `supabase/tests/180_workout_summary.sql`
- Modify: `supabase/tests/160_gamification_monthly_report.sql` (Arrange: metas de frequência 3)
- Modify: `docs/MVP_REQUIREMENTS.md` (RF-28: "padrão 3" → "padrão 5"), `docs/superpowers/specs/2026-10-07-relatorio-mensal-design.md` ("sem meta, 3" → "sem meta, 5")
- Modify: `src/lib/supabase/database.types.ts` (via `npm run types:gen`)

**Interfaces:**

- Produces: `public.weekly_check_in_target(uuid) returns integer` (default 5).
- Produces: `public.workout_summary(target_workout_id uuid) returns jsonb` com exatamente:
  `{ name: text, finished_at: timestamptz, duration_seconds: int, sets: int, volume_kg: numeric, week: { check_ins: int, target: int, met_now: bool }, new_achievements: text[], records: int, recorded_by_student: bool }`.
  Erros: `AUTH_REQUIRED`, `WORKOUT_NOT_FOUND`, `WORKOUT_ACCESS_DENIED`, `WORKOUT_NOT_FINISHED`.

- [ ] **Step 1: Ajustar o teste 160 para não depender da meta padrão.** No Arrange, inserir em `public.student_goals` metas `attendance` ativas com `target_value = 3` para Ana, Bruno e Carla (campos obrigatórios: `trainer_id`, `student_id`, `kind`, `initial_value` ≠ `target_value`, `target_value`, `target_date >= hoje`, `created_by`). Trocar a descrição da asserção "sem meta de frequência, a meta semanal é 3" por "meta de frequência ativa define a meta semanal" (valor continua 3).

- [ ] **Step 2: Escrever `180_workout_summary.sql` (pgTAP, `begin … rollback`, `plan(N)`).** Fixtures: Ana `…0002`, personal `…0001`, Bruno `…0003` (seed); treinos via `insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, recorded_by)` e séries em `workout_exercises`/`workout_sets` (`completed_at` preenchido); finalizar com `select public.finish_workout(id, null)` logado como Ana para disparar recordes e medalhas. Asserções:
  - sem meta ativa, `weekly_check_in_target(ana) = 5`;
  - com meta `attendance` ativa 4, `target = 4`;
  - semana com 4 dias já com check-in + treino num 5º dia → `met_now = true`, `check_ins = 5`;
  - segundo treino no mesmo dia → `met_now = false`;
  - dia que já tinha aula `completed` → `met_now = false`;
  - primeiro treino da conta → `new_achievements` contém `first_check_in`;
  - exercício inédito com carga → `records = 0`; mesmo exercício depois com carga maior → `records = 1`;
  - `sets` = séries concluídas; `volume_kg` = soma de `weight_kg * reps` das concluídas;
  - `recorded_by_student = false` quando `recorded_by` é o personal;
  - Bruno chamando para treino da Ana → `throws_ok … 'WORKOUT_ACCESS_DENIED'`;
  - treino não finalizado → `throws_ok … 'WORKOUT_NOT_FINISHED'`.

- [ ] **Step 3: Rodar e ver falhar.** `npm run test:db` → 180 falha (função não existe); 160 passa.

- [ ] **Step 4: Escrever a migração.**
  - `create or replace function public.weekly_check_in_target(uuid)`: igual à atual, com `coalesce(…, 5)`.
  - `workout_summary`: autoriza (aluno ou `public.is_active_trainer_of(student_id)`); `day = (started_at at time zone 'America/Sao_Paulo')::date`; `week_start = public.week_start_of(day)`.
    - `first_of_day`: não existe outro treino finalizado e não descartado da aluna com o mesmo dia local e `finished_at < este.finished_at`, nem aula `completed` no mesmo dia local.
    - `check_ins` = dias distintos em `public.student_check_ins` da aluna com `day between week_start and day`.
    - `met_now = first_of_day and check_ins = target`.
    - `new_achievements` = códigos em `student_achievements` com `earned_at = workout.finished_at`.
    - `records` = exercícios distintos do treino com alguma série `cardinality(record_kinds) > 0` **e** com série anterior válida (`weight_kg > 0`, `reps > 0`, `set_type <> 'warmup'`) em treino finalizado não descartado anterior da aluna.
  - Revogar de `public, anon`; `grant execute … to authenticated`.

- [ ] **Step 5: Rodar e ver passar.** `npm run test:db` → `Result: PASS` (todos os arquivos).

- [ ] **Step 6: Tipos e docs.** `npm run types:gen`; atualizar RF-28 e a spec do relatório para meta padrão 5.

- [ ] **Step 7: Commit** `feat: workout_summary e meta padrão 5`.

---

### Task 2: Regras puras e consulta do resumo

**Files:**

- Create: `src/features/workouts/workout-summary.ts` (schema Zod, tipo, hook)
- Create: `src/features/workouts/workout-share.ts`
- Test: `src/features/workouts/workout-share.test.ts`
- Modify: `src/features/workouts/keys.ts` (chave do resumo)

**Interfaces:**

- Consumes: RPC `workout_summary` (Task 1).
- Produces: `type WorkoutSummary` (mesmas chaves do JSON da RPC), `workoutSummarySchema`, `useWorkoutSummary(workoutId: string | null): UseQueryResult<WorkoutSummary>`, `workoutKeys.summary(workoutId)`.
- Produces: `workoutShareTitle(s: WorkoutSummary): 'MEDALHA NOVA!' | 'SEMANA BATIDA!' | 'RECORDE!' | 'TREINO FEITO'`, `workoutAchievementsLine(s: WorkoutSummary): string`, `hasWorkoutAchievement(s: WorkoutSummary): boolean`.

- [ ] **Step 1: Testes (`workout-share.test.ts`).**
  - medalha + semana + recorde → título `MEDALHA NOVA!`; só semana → `SEMANA BATIDA!`; só recorde → `RECORDE!`; nada → `TREINO FEITO`.
  - linha com medalha `streak_4`, semana 5/5 e 2 recordes → `"Sequência 4 · Semana 5 de 5 · 2 recordes"`; 1 recorde → `"1 recorde"`; sem conquistas → `""`.
  - `hasWorkoutAchievement`: true com qualquer uma das três; false sem nenhuma.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run src/features/workouts/workout-share.test.ts`.
- [ ] **Step 3: Implementar** usando `achievementName` de `src/features/gamification/achievement-catalog.ts` para os nomes.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `feat: regras do card pós-treino`.

---

### Task 3: Card, diálogo e integração na sessão

**Files:**

- Create: `src/features/workouts/WorkoutShareCard.tsx`
- Create: `src/features/workouts/WorkoutShare.tsx` (botão + diálogo)
- Test: `src/features/workouts/WorkoutShare.test.tsx`
- Modify: `src/features/workouts/WorkoutSessionPage.tsx` (tela "Treino finalizado!")

**Interfaces:**

- Consumes: `useWorkoutSummary`, `workoutShareTitle`, `workoutAchievementsLine`, `hasWorkoutAchievement` (Task 2); `renderCardBlob`, `deliverCard`, `shareButtonLabel` de `src/features/gamification/share-image.ts`.
- Produces: `<WorkoutShareCard summary studentName cardRef />` (1080×1920, mesmo visual do `ShareCard`); `<WorkoutShare workoutId isStudent studentName />`.

- [ ] **Step 1: Testes (`WorkoutShare.test.tsx`, mock de `useWorkoutSummary`).**
  - com conquista e `isStudent` → diálogo aberto ao montar, com título e botões **Compartilhar**/**Agora não**; "Agora não" fecha.
  - sem conquista → diálogo fechado; botão **Compartilhar** visível.
  - `isStudent = false` → nem botão nem diálogo.
  - erro da consulta → texto "Não foi possível preparar o card deste treino." e nenhum botão.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `WorkoutShareCard` (faixa de título, nome do treino, data, nome do aluno, três números, linha de conquistas, "N de M check-ins nesta semana", frase "Um treino de cada vez.") e `WorkoutShare` (card fora da tela em `left-[-10000px]`, erro de imagem "Não foi possível gerar a imagem. Tente novamente.").
- [ ] **Step 4: Integrar** no resumo de `WorkoutSessionPage`: `<WorkoutShare workoutId={workout.id} isStudent={profile.id === workout.student_id} studentName={profile.full_name} />` abaixo dos números.
- [ ] **Step 5: Rodar testes e gate** (`npm run test`, `lint`, `typecheck`, `build`).
- [ ] **Step 6: Commit** `feat: card compartilhável pós-treino`.

---

### Task 4: Verificação no navegador e status

**Files:**

- Modify: `docs/superpowers/specs/2026-10-11-card-pos-treino-design.md` (seção "Estado")

- [ ] **Step 1:** Com o app local apontando para o Supabase local, em 390 px: entrar como aluna, iniciar uma ficha, concluir séries, finalizar; conferir resumo, abertura automática quando a semana bate, botão Compartilhar sem conquista e PNG 1080×1920 baixado.
- [ ] **Step 2:** Registrar o resultado na spec e commitar `docs: estado do card pós-treino`.
