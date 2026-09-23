# Integração com o Hevy — importação de treinos realizados

## Resultado esperado

Um usuário com Hevy Pro conecta sua conta em **Conta → Integrações**, clica
em "Sincronizar agora" e vê seu histórico de treinos do Hevy aparecer como
treinos do Dedic (mesma tela de histórico que já existe para treinos nativos).

## Requisitos relacionados

- ADR 0007 (decisão de escopo e arquitetura).
- ADR 0006 (catálogo de exercícios e modelo de treinos nativos, reaproveitado
  aqui).

## Cenários de aceite

- Dado que o usuário informa uma chave de API válida, quando salva, então a
  conexão aparece como ativa e a chave nunca é reexibida no cliente.
- Dado um usuário conectado, quando clica em "Sincronizar agora", então os
  treinos do Hevy aparecem no histórico de treinos do Dedic, com exercícios e
  séries (peso e repetições) preenchidos.
- Dado um treino já importado, quando o usuário sincroniza de novo, então o
  treino não é duplicado.
- Dado um exercício do Hevy sem correspondente óbvio no catálogo, quando
  importado, então um exercício `custom` é criado em nome do próprio usuário,
  do mesmo jeito que um exercício criado manualmente.
- Dado um erro na sincronização (chave inválida, Hevy fora do ar), quando
  ocorre, então o usuário vê uma mensagem de erro clara e pode tentar de novo.

## Fora do escopo

- Escrever de volta no Hevy (o Dedic nunca envia dados para lá).
- Importar rotinas/fichas do Hevy (só treinos realizados).
- Sincronização automática/agendada (só sob demanda, por botão).
- Suporte a mais de uma conta Hevy por usuário.

## Impacto previsto

### Interface

- Nova seção em `AccountPage`: "Integrações" → card do Hevy com estado
  (desconectado / conectado desde X, última sincronização Y), campo para
  colar a chave de API, botões "Conectar", "Sincronizar agora" e
  "Desconectar".
- Estado de carregamento durante a sincronização (pode levar alguns
  segundos, é uma chamada de rede real para fora do Supabase).
- Treinos importados aparecem na tela de histórico de treinos já existente;
  nenhuma tela nova precisa ser criada para exibição.

### Domínio e banco

- `hevy_connections (user_id pk, secret_id uuid, connected_at, last_synced_at,
  last_sync_status, last_sync_error)` — RLS: select apenas do próprio dono;
  toda escrita passa por função `security definer`.
- Chave de API guardada via `supabase_vault` (`vault.create_secret`), nunca
  em coluna de texto simples.
- `hevy_workout_imports (hevy_workout_id text pk, workout_id uuid, student_id
  uuid, imported_at)` — garante idempotência da importação.
- `hevy_exercise_template_map (template_id text, owner_id uuid, exercise_id
  uuid, primary key (template_id, owner_id))` — cache do casamento entre
  exercício do Hevy e exercício do catálogo do Dedic, evita recriar
  `custom` a cada sincronização.
- Funções novas, todas `security definer`:
  - `connect_hevy_account(requested_api_key text)` — authenticated, grava o
    segredo no Vault e a conexão.
  - `disconnect_hevy_account()` — authenticated, apaga segredo e conexão.
  - `get_hevy_api_key(target_user_id uuid) returns text` — **apenas
    `service_role`**, decifra a chave para uso da função serverless.
  - `match_or_create_hevy_exercise(hevy_template_id text, requested_title
    text, owner_id uuid) returns uuid` — casa por similaridade de nome
    (reaproveita os índices trigram já existentes em `exercises`) ou cria
    `custom`.
  - `import_hevy_workout(target_student_id uuid, hevy_workout_id text,
    payload jsonb) returns uuid` — **apenas `service_role`**, insere
    `workouts`/`workout_exercises`/`workout_sets` a partir do JSON bruto do
    Hevy, idempotente por `hevy_workout_id`.
- `/api/hevy-sync.ts` (função serverless na Vercel, Node/TypeScript):
  1. Valida o token do usuário autenticado (Supabase `auth.getUser`).
  2. Lê a chave decifrada via `get_hevy_api_key` (usando a `service_role`
     key, que só existe como variável de ambiente na Vercel).
  3. Pagina `GET /v1/workouts` do Hevy desde a última sincronização.
  4. Para cada treino, chama `import_hevy_workout` com o payload bruto.
  5. Atualiza `last_synced_at`/`last_sync_status` em `hevy_connections`.

### Segurança e privacidade

- A chave do Hevy nunca é lida pelo cliente depois de salva (nem pela função
  de conectar, que só confirma sucesso).
- `get_hevy_api_key` e `import_hevy_workout` são executáveis apenas por
  `service_role` — um cliente autenticado comum não consegue chamá-las nem
  para si mesmo, então não há como um usuário importar treino em nome de
  outro.
- A `service_role` key do Supabase é variável de ambiente só da Vercel,
  nunca `VITE_*`, nunca no repositório.

### Testes

- Unitários: mapeamento do payload do Hevy para o formato interno (função
  pura, sem tocar banco), tratamento de tipos de série desconhecidos.
- Componentes: card de integração (conectado/desconectado, erro de
  sincronização).
- Banco/integração: `import_hevy_workout` idempotente (rodar duas vezes com
  o mesmo `hevy_workout_id` não duplica); `get_hevy_api_key` e
  `import_hevy_workout` negadas para o papel `authenticated`.
- E2E: fica como validação manual nesta primeira versão (depende de uma
  conta Hevy Pro real).

## Riscos e casos extremos

- Concorrência: duas sincronizações simultâneas do mesmo usuário — mitigado
  pela idempotência de `import_hevy_workout` (não pela exclusão mútua).
- Repetição/idempotência: coberta por `hevy_workout_imports`.
- Datas e fuso: o Hevy manda horários em UTC (ISO 8601); gravamos como
  `timestamptz` sem conversão, igual ao resto do app.
- Falha intermediária: se a sincronização cair no meio da paginação, os
  treinos já importados continuam válidos (idempotência) e a próxima
  tentativa retoma do que falta.
- Exercício sem nome parecido no catálogo: cria `custom`; pode acumular
  duplicados ao longo do tempo — aceito nesta versão, revisão manual fica
  para depois.

## Verificação

- [ ] Critérios de aceite atendidos
- [ ] Layout validado em celular
- [ ] Estados de carregamento, vazio e erro tratados
- [ ] Autorização verificada no banco
- [ ] Testes adicionados
- [ ] Quality gate executado
- [ ] Documentação atualizada, se necessário
