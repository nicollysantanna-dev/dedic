# Exclusão de conta — design

Data: 02/10/2026 · Origem: D9 da [ADR 0005](../../adr/0005-decisoes-de-produto-para-o-mvp.md)
(anonimização preservando histórico, LGPD) · Marco: M7b (preparação para produção)

## Objetivo

Personal e aluno conseguem excluir a própria conta pelo app. Depois da exclusão a pessoa
não consegue mais entrar, nenhum dado a identifica, seus dados de saúde deixam de
existir e o histórico de negócio da outra parte (aulas, créditos, pagamentos, treinos)
continua íntegro e auditável.

## Decisões de produto (02/10/2026)

| Tema                    | Decisão                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Dados de saúde do aluno | Apagados: medidas/peso (`progress_entries`), fotos de evolução e metas.                 |
| Treinos e fichas        | Mantidos, ligados ao perfil anonimizado; notas em texto livre são limpas.               |
| Personal com alunos     | Exclusão permitida: cancela aulas futuras com devolução, encerra vínculos e convites.   |
| Aulas de hoje           | Canceladas com devolução se ainda não começaram (exceção à trava do mesmo dia só aqui). |
| Confirmação             | Imediata e irreversível, digitando `EXCLUIR`. Sem carência.                             |

## Restrições do modelo atual

- Quase todas as FKs para `profiles` são `NO ACTION`; `profiles.id` tem `ON DELETE CASCADE`
  para `auth.users`. Logo, nem `profiles` nem `auth.users` podem ser apagados.
- `credit_transactions`, `appointment_events`, `payment_events` e `progress_entries` são
  imutáveis por trigger. `appointments_same_day_lock` bloqueia cancelamento no dia.
- `profiles.full_name` exige 2–100 caracteres; `phone` exige E.164 ou nulo; `avatar_path`
  exige prefixo do próprio id ou nulo; personal exige `default_lesson_duration_minutes`.

## Arquitetura

```text
AccountPage ──► DeleteAccountDialog ──POST /api/delete-account (Bearer)──►
  api/delete-account.ts
    1. admin.auth.getUser(token)              → uid (nunca vem do corpo)
    2. rpc delete_account(uid)                → transação única no banco
    3. storage: remove {uid}/* em progress-photos e avatar-photos
    4. auth.admin.updateUserById(uid, …)      → e-mail placeholder, metadata vazio,
                                                 senha aleatória, ban longo
    5. auth.admin.signOut(token, 'global')    → revoga refresh tokens
  ◄── 200 { status: 'deleted' } | 4xx/5xx { code }
cliente: signOut local → "/" com aviso "Sua conta foi excluída"
```

Passos 2–5 são idempotentes: uma nova chamada após falha parcial conclui o restante.

### Banco: `public.delete_account(target_user_id uuid)`

`security definer`, `search_path` fixo, execução concedida apenas a `service_role`.
Ativa `set_config('dedic.account_deletion', 'on', true)` (local à transação). Os triggers
de imutabilidade de `progress_entries` e a trava do mesmo dia passam a aceitar a operação
somente quando essa GUC está ativa; nenhum outro caminho a define.

Ordem, numa única transação:

1. Se `profiles.deleted_at` já estiver preenchido, retorna sem alterar nada.
2. Cancela toda aula `scheduled` com `starts_at > now()` em que o usuário é aluno ou
   personal, chamando `cancel_appointment` com
   `request.jwt.claim.sub` definido como o usuário excluído (sem função interna extraída):
   estorno `cancellation_refund` no extrato, evento
   `cancelled` com autor = usuário excluído e notificação para a outra parte. Status:
   `cancelled_by_student` ou `cancelled_by_trainer` conforme o papel do usuário.
3. Encerra vínculos ativos/pendentes (`status = 'ended'`, `ended_at = now()`).
4. Cancela convites `pending` enviados pelo usuário; nos convites destinados a ele,
   anula `student_email`/`student_phone` (vínculo histórico fica por `accepted_by`).
5. Se aluno: apaga `progress_entries`, `progress_photos` e `student_goals` dele.
6. Limpa `notes` de `workouts`, `workout_exercises`, `routines` e `routine_exercises`
   pertencentes ao usuário (aluno do treino/ficha ou criador). Linhas permanecem.
7. Apaga `hevy_connections` (e o segredo em `vault.secrets`) e
   `hevy_exercise_template_map` do usuário; `hevy_workout_imports` permanece (só IDs).
8. Apaga `notifications` do próprio usuário.
9. Anonimiza `profiles`: `full_name = 'Usuário removido'`, `phone = null`,
   `avatar_path = null`, `deleted_at = now()` (coluna nova, `timestamptz`).

Mantido sem alteração (histórico de negócio imutável): `credit_transactions`,
`appointment_events`, `payment_events`, `payments`, `lesson_packages`, `appointments`.
Notas de cancelamento já gravadas e primeiros nomes em notificações de terceiros
permanecem — resíduo aceito e registrado na ADR.

Perfis com `deleted_at` não podem ser alvo de novos convites, vínculos ou agendamentos:
as RPCs `claim_student_invitation` e de agendamento já exigem vínculo ativo, e o usuário
não consegue mais autenticar; nenhuma checagem extra é necessária no MVP.

### API: `api/delete-account.ts`

Mesmo padrão de `api/hevy-sync.ts`: só `POST`, `Authorization: Bearer`, `createAdminClient`
(500 `SERVER_MISCONFIGURED` sem env), `getUser` (401 `AUTH_REQUIRED`/`INVALID_TOKEN`),
try/catch externo (500 `UNEXPECTED_ERROR`). Falhas nos passos 2–5 retornam 500 com
códigos `DELETE_FAILED`, `STORAGE_CLEANUP_FAILED` ou `AUTH_CLEANUP_FAILED`. Logs contêm
apenas o código — sem uid, e-mail, nome ou corpo de resposta. Registrada em
`vercel.json → functions`.

E-mail placeholder: `removido-{uid}@dedic.invalid` (domínio reservado, nunca entrega).
`ban_duration` de 100 anos. A combinação é validada no Supabase local antes de fechar.

### Interface (`src/features/account`)

- `AccountPage`: card "Excluir conta" ao final, visual de perigo.
- `DeleteAccountDialog`: lista o que é apagado e o que é mantido anonimizado; para o
  personal, mostra quantas aulas futuras serão canceladas e quantos alunos desvinculados
  (consulta às tabelas já visíveis por RLS); campo de confirmação que habilita o botão
  apenas com `EXCLUIR`; estados de envio, erro com "Tentar novamente" e sucesso.
- Após sucesso: `supabase.auth.signOut()` e navegação para `/` com aviso.
- Mutação e chamada HTTP em `delete-account-queries.ts`, no padrão de `hevy-queries.ts`.

## Testes

- pgTAP `supabase/tests/140_account_deletion.sql`:
  - aluno com aula futura, aula de hoje (não iniciada), medidas, fotos, metas e treino:
    aulas canceladas com estorno, saúde apagada, treino mantido sem notas, perfil anonimizado;
  - personal com aluno ativo e aula futura: aula cancelada, vínculo encerrado, aluno notificado;
  - segunda execução não gera estorno adicional;
  - `authenticated` não executa `delete_account`;
  - fora da RPC, `progress_entries` continua imutável e a trava do mesmo dia continua ativa.
- Vitest `api/delete-account.test.ts`: método inválido, sem token, token inválido, sucesso,
  falha da RPC, falha no Storage (não chama Auth) e reexecução.
- Testing Library `DeleteAccountDialog.test.tsx`: botão só habilita com `EXCLUIR`, resumo
  do personal, estado de erro.
- Playwright: usuário extra do seed exclui a conta, vê o aviso e não consegue entrar de novo.

## Documentação

- ADR 0008 — exclusão de conta por anonimização (o que é apagado, mantido e o resíduo).
- ADR 0005: D9 aponta para a ADR 0008.
- `MVP_REQUIREMENTS.md`: requisito de exclusão de conta em RF-02.

## Fora do escopo

- Termos de uso e política de privacidade (próximo item do M7b).
- Exportação de dados (portabilidade LGPD) — depois do piloto.
- Exclusão por administrador ou por solicitação externa.
