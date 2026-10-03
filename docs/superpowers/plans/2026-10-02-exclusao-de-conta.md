# Exclusão de conta — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** personal e aluno excluem a própria conta pelo app; a conta é anonimizada e
bloqueada, dados de saúde e arquivos pessoais somem e o histórico de negócio permanece.

**Architecture:** `POST /api/delete-account` (Vercel, service role) valida o token, chama a
RPC transacional `delete_account(uid)`, remove a pasta `{uid}/` dos buckets pessoais e
anonimiza/bane o usuário no Auth. A UI em `/app/conta` confirma com `EXCLUIR`.

**Tech Stack:** Supabase (PostgreSQL, pgTAP, Storage, Auth admin), Vercel functions
(`@vercel/node`), React + TanStack Query, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-exclusao-de-conta-design.md`

## Global Constraints

- Nome anonimizado: `Usuário removido`. E-mail placeholder: `removido-{uid}@dedic.invalid`.
- `ban_duration`: `876000h` (100 anos).
- GUC da exceção: `dedic.account_deletion` = `on`, sempre com `set_config(..., true)` (local).
- Buckets limpos: `progress-photos` e `avatar-photos`, prefixo `{uid}/`. `exercise-photos` não.
- `delete_account` executável só por `service_role`.
- Códigos de erro da API: `METHOD_NOT_ALLOWED` 405, `AUTH_REQUIRED` 401, `INVALID_TOKEN` 401,
  `SERVER_MISCONFIGURED` 500, `DELETE_FAILED` 500, `STORAGE_CLEANUP_FAILED` 500,
  `AUTH_CLEANUP_FAILED` 500, `UNEXPECTED_ERROR` 500. Sucesso: 200 `{ "status": "deleted" }`.
- Logs da API: apenas `[delete-account] <CÓDIGO>`, sem uid, e-mail, nome, token ou corpo.
- Interface em português, código em inglês, TypeScript estrito, sem `any`.
- E2E e testes nunca usam o Supabase remoto do `.env`/`.env.local`.

## Review Focus

1. **Notificação de cancelamento ao destinatário errado** — chamada com service role tem
   `auth.uid()` nulo e `notify_appointment_change` cai em `created_by`. Esperado: a outra
   parte da aula é notificada. Coberto no pgTAP da Task 1 (aula criada pelo personal,
   excluída pelo aluno → notificação vai para o personal).
2. **Reexecução após falha parcial** (Storage ou Auth falhou) — esperado: nova chamada
   conclui sem estorno duplicado nem erro. pgTAP (Task 1) e Vitest (Task 2).
3. **Pasta vazia ou inexistente no Storage** (usuário sem foto) — esperado: sucesso.
   Vitest da Task 2 (`list` retorna `[]` → `remove` não é chamado, segue para o Auth).
4. **Aula já iniciada hoje** (`starts_at <= now()`) — esperado: não é cancelada nem
   estornada; a finalização automática a conclui. pgTAP da Task 1.
5. **Sessão aberta em outro dispositivo** — esperado: refresh revogado por `signOut global`
   e login bloqueado pelo ban. E2E da Task 4 (login após exclusão falha).

---

### Task 1: RPC `delete_account` e exceções controladas no banco

**Files:**

- Create: `supabase/migrations/20261002120000_account_deletion.sql`
- Create: `supabase/tests/140_account_deletion.sql`
- Modify: `src/lib/supabase/database.types.ts` (via `npm run types:gen`)

**Interfaces:**

- Produces: `public.delete_account(target_user_id uuid) returns void` (grant só
  `service_role`); coluna `profiles.deleted_at timestamptz null`.

- [ ] **Step 1: Escrever o pgTAP `140_account_deletion.sql`** no padrão de
      `060_progress_and_photos.sql` (`ctx` temporário, `pg_temp.login`, `begin … rollback`).
      Arrange como `postgres`: para a aluna Ana (`…0002`) uma aula futura (amanhã) criada pelo
      personal, uma aula hoje com `starts_at = now() + interval '2 hours'`, uma aula hoje já
      iniciada (`now() - interval '10 minutes'`), um `progress_entries`, um `progress_photos`,
      uma `student_goals`, um treino com `notes = 'nota'`. Asserções (`plan` = 17, ajustar ao total final): - `throws_ok` ao chamar `delete_account` como `authenticated` (permissão negada); - como `service_role`, `lives_ok(select public.delete_account(ana))`; - as duas aulas não iniciadas ficam `cancelled_by_student`; a já iniciada segue `scheduled`; - `credit_transactions` tem 2 `cancellation_refund` novos para Ana; - existe `notifications` `appointment_cancelled` para o personal (`…0001`) e o corpo
      começa com `Ana` (cancelamento antes da anonimização); - `progress_entries`, `progress_photos` e `student_goals` de Ana = 0; - o treino existe e `notes is null`; - vínculo de Ana `ended`; - `profiles`: `full_name = 'Usuário removido'`, `phone is null`, `avatar_path is null`,
      `deleted_at is not null`; - `notifications` de Ana = 0; - segunda chamada: `lives_ok` e contagem de `cancellation_refund` continua +2; - fora da RPC: `delete from progress_entries` (de Bruno) `throws_ok`; - fora da RPC: cancelar uma aula de hoje de Bruno via `cancel_appointment` `throws_ok`
      com `SAME_DAY_APPOINTMENT_LOCKED`; - cenário personal (num `savepoint`/bloco separado, desfeito com `rollback to`): com
      uma aula futura de Bruno, `delete_account(personal)` deixa a aula
      `cancelled_by_trainer`, o vínculo de Bruno `ended` e cria notificação
      `appointment_cancelled` para Bruno.
- [ ] **Step 2: Rodar e ver falhar** — `npm run test:db` → FAIL (`delete_account` não existe).
- [ ] **Step 3: Escrever a migração.**
  - `alter table public.profiles add column deleted_at timestamptz;`
  - `public.prevent_progress_entry_mutation()`: permite `DELETE` quando
    `current_setting('dedic.account_deletion', true) = 'on'`, senão
    `raise exception 'PROGRESS_ENTRIES_ARE_IMMUTABLE'`; recriar o trigger
    `progress_entries_prevent_update` apontando para ela (não alterar
    `prevent_appointment_event_mutation`, usada por outras tabelas).
  - `enforce_same_day_appointment_lock()`: retornar `new` sem checar quando a GUC estiver `on`.
  - `delete_account(target_user_id uuid)`: `security definer`, `set search_path = ''`.
    Retorna cedo se `deleted_at` já preenchido (ou perfil inexistente). Ativa a GUC e
    `set_config('request.jwt.claim.sub', target_user_id::text, true)` para que
    `cancel_appointment` e `notify_appointment_change` vejam o usuário como ator. Em seguida,
    na ordem da spec: `perform public.cancel_appointment(id)` para cada aula `scheduled` com
    `starts_at > now()` do usuário (como aluno ou personal); vínculos `active`/`pending` →
    `ended`; convites `pending` enviados → `cancelled`; convites com `accepted_by` = usuário →
    `student_email`/`student_phone` nulos; se `role = 'student'` apagar `progress_entries`,
    `progress_photos`, `student_goals`; anular `notes` em `workouts`/`workout_exercises`/
    `routines`/`routine_exercises` do usuário; `perform` equivalente a
    `disconnect_hevy_account()` (apagar `vault.secrets` pelo `secret_id` e a linha) e
    `hevy_exercise_template_map`; apagar `notifications` do usuário (por último entre as
    escritas que geram notificação); anonimizar `profiles`.
  - `revoke all … from public, anon, authenticated; grant execute … to service_role;`
- [ ] **Step 4: Rodar** — `npm run test:db` → todos os arquivos passam, incluindo o 140.
- [ ] **Step 5: Tipos** — `npm run types:gen`; `npm run typecheck` passa.
- [ ] **Step 6: Commit** — `feat: RPC de exclusão de conta por anonimização`.

### Task 2: Função `/api/delete-account`

**Files:**

- Create: `api/delete-account.ts`, `api/delete-account.test.ts`
- Modify: `vercel.json` (functions: `"api/delete-account.ts": { "maxDuration": 30 }`),
  `scripts/dev-api-server.ts` (rota + pular `.env` quando `DEDIC_SKIP_DOTENV=1`)

**Interfaces:**

- Consumes: `delete_account` (Task 1); `createAdminClient()` de `api/hevy-sync-core.ts`.
- Produces: `export async function deleteAccount(admin: SupabaseClient<Database>, accessToken: string): Promise<DeleteAccountResult>`
  com `type DeleteAccountResult = { ok: true } | { ok: false; status: number; error: string }`,
  e o `default handler(req, res)` que só faz método/token/env e delega.

- [ ] **Step 1: Testes Vitest** com um `admin` falso (objetos com `vi.fn()` para
      `auth.getUser`, `rpc`, `storage.from(bucket).list/remove`, `auth.admin.updateUserById`,
      `auth.admin.signOut`):
  - `rejeita método diferente de POST` → handler 405 `METHOD_NOT_ALLOWED`;
  - `exige token` → 401 `AUTH_REQUIRED`;
  - `token inválido` → `{ ok: false, status: 401, error: 'INVALID_TOKEN' }`, `rpc` não chamado;
  - `sucesso` → `rpc('delete_account', { target_user_id: uid })`, `remove` chamado com os
    caminhos `uid/…` listados em cada bucket, `updateUserById(uid, { email: 'removido-<uid>@dedic.invalid', user_metadata: {}, ban_duration: '876000h', password: <string ≥ 32> })`,
    `signOut(token, 'global')`, resultado `{ ok: true }`;
  - `pasta vazia` → `list` retorna `[]`, `remove` não chamado, `{ ok: true }`;
  - `falha da RPC` → `DELETE_FAILED`, Storage e Auth não chamados;
  - `falha no Storage` → `STORAGE_CLEANUP_FAILED`, `updateUserById` não chamado;
  - `falha no Auth` → `AUTH_CLEANUP_FAILED`;
  - `logs sem dado pessoal` → `console.error` espiado não recebe o uid nem o token.
- [ ] **Step 2: Rodar** — `npx vitest run api/delete-account.test.ts` → FAIL (módulo ausente).
- [ ] **Step 3: Implementar** `api/delete-account.ts` seguindo `api/hevy-sync.ts`. Listar com
      `list(uid, { limit: 1000 })` e remover `uid/<name>`; senha aleatória com
      `crypto.randomBytes(32).toString('base64url')`. `signOut` com falha não reprova (a
      sessão expira e o login já está banido) — registrar só o código.
- [ ] **Step 4: Rota no dev server** — adicionar `'/api/delete-account'`; envolver o
      `process.loadEnvFile('.env')` em `if (process.env.DEDIC_SKIP_DOTENV !== '1')`.
- [ ] **Step 5: Rodar** — teste passa; `npm run lint && npm run typecheck`.
- [ ] **Step 6: Validar o Auth no local** — com `npx supabase start`, criar usuário pelo
      admin local, chamar `updateUserById` com os valores acima e confirmar que
      `signInWithPassword` com a senha original falha. Script descartável no scratchpad;
      registrar o resultado no commit.
- [ ] **Step 7: Commit** — `feat: endpoint de exclusão de conta`.

### Task 3: Interface em `/app/conta`

**Files:**

- Create: `src/features/account/delete-account-queries.ts`,
  `src/features/account/DeleteAccountDialog.tsx`,
  `src/features/account/DeleteAccountDialog.test.tsx`
- Modify: `src/features/account/AccountPage.tsx`, `src/features/auth/AuthPage.tsx`

**Interfaces:**

- Consumes: `POST /api/delete-account` (Task 2); `useAuth()` (`session`, `profile`, `signOut`).
- Produces: `useDeleteAccount()` (mutation: `(accessToken: string) => Promise<void>`, lança
  `Error(code)` como `useSyncHevy`); `useDeletionImpact(profile)` → `{ futureLessons: number; activeStudents: number }`
  só para personal (contagens via RLS em `appointments` `scheduled` futuras e
  `trainer_student_relationships` `active`); `<DeleteAccountDialog open onOpenChange />`.

- [ ] **Step 1: Testes Testing Library**
  - `botão Excluir conta só habilita com EXCLUIR` — digitar `excluir` mantém desabilitado;
    `EXCLUIR` habilita;
  - `personal vê o impacto` — com `futureLessons = 3`, `activeStudents = 2` aparece
    `3 aulas futuras serão canceladas` e `2 alunos serão desvinculados`;
  - `erro mostra tentar novamente` — mutation rejeitada → `role="alert"` com
    `Não foi possível excluir sua conta.` e botão `Tentar novamente`.
- [ ] **Step 2: Rodar** — `npx vitest run src/features/account/DeleteAccountDialog.test.tsx` → FAIL.
- [ ] **Step 3: Implementar** o diálogo com `components/ui/dialog`. Texto fixo:
  - Apagado: `Seu perfil, foto, telefone, medidas, fotos de evolução, metas e a conexão com o Hevy.`
  - Mantido sem identificação: `Aulas, créditos, pagamentos e treinos já registrados, para o histórico da outra parte.`
  - Rótulo do campo: `Digite EXCLUIR para confirmar`.
  - Sucesso: `signOut()` e `navigate('/?conta=excluida', { replace: true })`.
- [ ] **Step 4: Card na `AccountPage`** — último card, título `Excluir conta`, botão
      `variant="destructive"` (ou classe de perigo se a variante não existir) abre o diálogo.
- [ ] **Step 5: Aviso no `AuthPage`** — com `?conta=excluida`, `role="status"`:
      `Sua conta foi excluída.`
- [ ] **Step 6: Rodar** — teste passa; `npm run lint && npm run typecheck && npm run test`.
- [ ] **Step 7: Commit** — `feat: excluir conta pela página de conta`.

### Task 4: Jornada E2E

**Files:**

- Modify: `playwright.config.ts`, `tests/e2e/journeys.spec.ts` (ou novo
  `tests/e2e/account-deletion.spec.ts`), `.github/workflows/ci.yml` se precisar de env.

**Interfaces:**

- Consumes: Tasks 2 e 3.

- [ ] **Step 1: Servir a API no E2E** — `webServer` vira lista: o atual e
      `npx tsx scripts/dev-api-server.ts` em `http://127.0.0.1:3002` com env
      `DEDIC_SKIP_DOTENV=1`, `SUPABASE_URL=http://127.0.0.1:54321` e a service role key padrão
      do Supabase local (pública do CLI, como a anon já presente no arquivo). Adicionar
      `preview.proxy` em `vite.config.ts` se o `server.proxy` não valer no preview.
- [ ] **Step 2: Teste** `usuário cria conta, exclui e não consegue mais entrar` — cadastro
      com e-mail único (`excluir-<timestamp>@dedic.local`), vai a `/app/conta`, abre
      `Excluir conta`, digita `EXCLUIR`, confirma; espera URL `/?conta=excluida` e
      `Sua conta foi excluída.`; tenta entrar com o mesmo e-mail/senha e vê erro de login.
      Usar conta nova evita mexer no seed (o `000_helpers.sql` conta 4 perfis).
- [ ] **Step 3: Rodar** — `npm run test:e2e` → todos passam, sem violação de CSP.
- [ ] **Step 4: Commit** — `test: jornada de exclusão de conta`.

### Task 5: Documentação

**Files:**

- Create: `docs/adr/0008-exclusao-de-conta-por-anonimizacao.md` (modelo `0000-template.md`)
- Modify: `docs/adr/0005-decisoes-de-produto-para-o-mvp.md` (D9 → ver ADR 0008),
  `docs/adr/README.md` (índice), `docs/MVP_REQUIREMENTS.md` (RF-02: exclusão de conta),
  spec (passo 2: cancelamento reutiliza `cancel_appointment` assumindo o usuário via
  `request.jwt.claim.sub`, em vez de função interna extraída)

- [ ] **Step 1:** ADR 0008 com contexto (FKs e imutabilidade), decisão (tabela da spec),
      consequências (resíduo aceito: notas de cancelamento e primeiros nomes em notificações
      de terceiros; o e-mail original fica livre para um novo cadastro, pois o Auth passa a
      usar o placeholder).
- [ ] **Step 2:** Atualizar os demais arquivos listados.
- [ ] **Step 3: Quality gate** — `npm run validate`, `npm run test:db`, `npm run test:e2e`.
- [ ] **Step 4: Commit** — `docs: ADR 0008 de exclusão de conta`.
