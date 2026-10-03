# ADR 0008 — Exclusão de conta por anonimização

- Status: aceita
- Data: 2026-10-02
- Responsáveis: Nic

## Contexto

A D9 da ADR 0005 decidiu atender à LGPD com anonimização do perfil preservando o
histórico de negócio. Faltava definir como fazer isso sem violar as invariantes do domínio:

- Quase todas as FKs para `profiles` são `NO ACTION` e `profiles.id` tem `ON DELETE CASCADE`
  para `auth.users`. Nem `profiles` nem `auth.users` podem ser apagados sem destruir
  histórico da outra parte.
- `credit_transactions`, `appointment_events`, `payment_events` e `progress_entries` são
  imutáveis por trigger, e `appointments_same_day_lock` bloqueia cancelamento no dia da aula.
- `profiles` tem restrições (`full_name` de 2 a 100 caracteres, `phone` E.164 ou nulo,
  `default_lesson_duration_minutes` para personal) que o perfil anonimizado precisa respeitar.
- O navegador não pode executar a exclusão completa: ela envolve Storage e Auth admin, que
  exigem `service_role`.

## Decisão

Personal e aluno excluem a própria conta em Conta → Excluir conta, com confirmação
imediata e irreversível (digitar `EXCLUIR`), sem carência.

| Tema                    | Decisão                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Dados de saúde do aluno | Apagados: medidas/peso (`progress_entries`), fotos de evolução e metas.                  |
| Treinos e fichas        | Mantidos, ligados ao perfil anonimizado; notas em texto livre são limpas.                |
| Personal com alunos     | Exclusão permitida: cancela aulas futuras com devolução, encerra vínculos e convites.    |
| Aulas de hoje           | Canceladas com devolução se ainda não começaram (exceção à trava do mesmo dia só aqui).  |
| Perfil                  | `full_name = 'Usuário removido'`, `phone`, `avatar_path` nulos, `deleted_at` preenchido. |
| Histórico de negócio    | Aulas, extrato, eventos, pagamentos e pacotes permanecem sem alteração.                  |

### Fluxo

`POST /api/delete-account` (função serverless na Vercel, mesmo padrão de `/api/hevy-sync`):

1. `getUser(token)` define o uid; ele nunca vem do corpo da requisição.
2. RPC `delete_account(uid)`, numa única transação, executável só por `service_role`.
3. Remoção dos arquivos `{uid}/*` em `progress-photos` e `avatar-photos`.
4. Auth: e-mail `removido-{uid}@dedic.invalid`, senha aleatória, `ban_duration` de
   `876000h` e `user_metadata` limpo.
5. `signOut` global para revogar refresh tokens.

Os passos 2 a 5 são idempotentes: repetir após falha parcial conclui o restante.
Logs registram apenas o código de erro.

### Banco: `delete_account`

- Ativa a GUC `dedic.account_deletion` (local à transação). O trigger de imutabilidade de
  `progress_entries` aceita `DELETE` e `appointments_same_day_lock` deixa passar somente
  com ela ativa; nenhum outro caminho a define.
- Se `profiles.deleted_at` já estiver preenchido, retorna logo no início sem alterar nada
  (uma chamada repetida é no-op). Isso garante que cancelar ou excluir duas vezes nunca
  devolve créditos adicionais.
- **Cancelamento reutiliza `cancel_appointment`**: a função define
  `request.jwt.claim.sub` como o usuário excluído dentro da transação e chama a RPC existente
  para cada aula `scheduled` futura (inclusive de hoje, ainda não iniciada). Assim estorno
  `cancellation_refund`, evento `cancelled` com autoria do usuário excluído e notificação
  para a outra parte seguem exatamente a regra do cancelamento manual, sem extrair função
  interna nem duplicar lógica. O status segue o papel do ator: `cancelled_by_student` quando
  o aluno exclui a conta e `cancelled_by_trainer` quando o personal exclui.
- Encerra vínculos ativos/pendentes, cancela convites `pending` enviados e anula
  `student_email`/`student_phone` dos convites aceitos pelo usuário.
- A constraint `invitation_has_single_contact` foi relaxada: os dois contatos podem ser
  nulos somente quando `accepted_by` está preenchido (necessário para limpar o contato do
  aluno excluído sem perder o vínculo histórico).
- Aluno: apaga `progress_entries`, `progress_photos` e `student_goals`.
- Limpa `notes` de `workouts` e `workout_exercises` em que o usuário é o aluno ou quem
  registrou o treino (`recorded_by`), e de `routines` e `routine_exercises` em que o usuário é
  o personal, o aluno ou o criador (`created_by`) da ficha. Notas de treinos de terceiros que o
  personal não registrou são mantidas.
- Apaga `hevy_connections` (e o segredo no Vault), `hevy_exercise_template_map` e as
  `notifications` do próprio usuário.
- Apaga as linhas de `auth.audit_log_entries` do usuário (`payload.actor_id` ou
  `payload.traits.user_id` igual ao uid), onde o GoTrue grava o e-mail original
  (`actor_username`) e o nome (`actor_name`) em cadastro, login e logout. As linhas que o
  endpoint gera depois da RPC (troca de e-mail, `signOut`) já trazem apenas o placeholder,
  verificado localmente; por isso basta limpar na RPC, sem segunda chamada. O `DELETE` fica num
  bloco que ignora `insufficient_privilege`: no Supabase hospedado o papel `postgres` pode não
  ter `DELETE` nessa tabela e, nesse caso, a limpeza vira no-op sem impedir a exclusão.

### Auth

O GoTrue mescla `user_metadata` (enviar `{}` não apaga nada), então o endpoint envia cada
chave existente com valor `null`. A troca de e-mail foi verificada localmente: o
`auth.identities.identity_data` acompanha o placeholder. Como o e-mail original deixa de
existir no Auth, ele fica livre para um novo cadastro.

### Interface

`DeleteAccountDialog` lista o que é apagado e o que é mantido anonimizado. O personal vê
quantas aulas futuras serão canceladas e quantos alunos serão desvinculados, e só pode
confirmar depois que essas contagens carregarem. O botão habilita apenas com `EXCLUIR`.
Após o sucesso, a UI faz recarga completa para `/?conta=excluida`, pois um redirecionamento
do roteador descartaria a query string.

## Alternativas consideradas

### Alternativa A — Apagar `profiles` e `auth.users`

Cumpre o apagamento literal, mas as FKs `NO ACTION` e o extrato imutável impedem a
operação; forçá-la destruiria o histórico financeiro e de agenda da outra parte. Rejeitada.

### Alternativa B — Carência de 30 dias com cancelamento da exclusão

Reduz exclusões por engano, mas exige estado intermediário, rotina agendada e manter dados
pessoais após o pedido. Rejeitada para o MVP; a confirmação digitada mitiga o erro.

### Alternativa C — Extrair função interna de cancelamento

Evitaria assumir o `sub` do JWT, mas duplicaria ou dividiria a regra crítica de estorno e
notificação. Reutilizar `cancel_appointment` mantém uma única implementação.

## Consequências

### Positivas

- A pessoa não consegue entrar, nenhum dado a identifica e seus dados de saúde deixam de existir.
- O histórico de negócio da outra parte permanece íntegro e auditável.
- A regra mora no banco, é transacional e idempotente.
- O e-mail original fica livre para um novo cadastro.

### Negativas

Resíduos aceitos:

- Notas de cancelamento já gravadas no extrato e nos eventos imutáveis permanecem.
- Primeiros nomes já renderizados em notificações de terceiros permanecem.
- Janela de milissegundos: uma reserva confirmada durante `delete_account` pode deixar uma
  aula `scheduled` para o usuário excluído; a outra parte ainda pode cancelá-la.
- `auth.users.phone` não é limpo (cadastro por celular não é usado no MVP).
- A listagem do Storage cobre uma página de 1000 arquivos por bucket.
- A exclusão é irreversível e não há exportação de dados (portabilidade fica para depois do piloto).
- Log de auditoria do Auth: no Supabase hospedado, se o `postgres` não puder apagar
  `auth.audit_log_entries`, o e-mail original permanece ali. Recomendação: desligar
  "Write auth audit logs to database" nas configurações de Auth do projeto. Os logs da
  plataforma Supabase (Auth/API) também guardam o e-mail até expirar a retenção do plano.
- Um access token emitido em outro dispositivo continua válido por até 1 h após a exclusão
  (a RLS não verifica `deleted_at`); nessa janela ainda são possíveis escritas por esse token.
- Se a resposta 200 se perder e o cliente repetir a chamada, a repetição recebe 401 (token
  revogado) e a UI mostra erro, embora a conta já tenha sido excluída.
- Convites pendentes enviados por **outros** personais para o e-mail do aluno são mantidos:
  são dados digitados por esses personais.
- Os arquivos em `exercise-photos/{uid}/` são mantidos de propósito: são imagens do catálogo
  de exercícios, não dados pessoais.

## Validação

- pgTAP `supabase/tests/140_account_deletion.sql` (cancelamento com estorno, dados de saúde,
  log de auditoria do Auth, idempotência, permissão e imutabilidade fora da RPC).
- Vitest do endpoint e Testing Library do diálogo.
- Playwright: usuário exclui a conta, vê o aviso e não consegue entrar de novo.
- Reavaliar os resíduos aceitos quando houver termos de uso e política de privacidade.
