# Sincronização automática diária do Hevy (polling)

> **Revertido em 2026-10-11** pelo item 0033: a sincronização volta a ser só
> manual ("Sincronizar agora").

## Resultado esperado

Todo usuário com conta Hevy conectada tem seu histórico de treinos, recordes
e (quando existir, ver 0030) fichas atualizados automaticamente uma vez por
dia, sem precisar lembrar de clicar em "Sincronizar agora". O botão manual
continua existindo para quem quiser forçar uma atualização antes disso.

## Requisitos relacionados

- ADR 0007 (decisão de escopo e arquitetura do Hevy; seção "Trabalho futuro").
- `api/hevy-sync.ts` (lógica de sincronização por usuário, reaproveitada aqui
  sem mudanças na paginação/idempotência).

## Cenários de aceite

- Dado um usuário com conta Hevy conectada, quando o job diário roda, então
  seu histórico é sincronizado sem nenhuma ação do usuário.
- Dado um treino já importado num dia anterior, quando o job diário roda de
  novo, então o treino não é duplicado (mesma garantia de
  `hevy_workout_id` que já existe hoje).
- Dado um usuário desconectado do Hevy, quando o job diário roda, então ele é
  ignorado (não tenta sincronizar quem não está conectado).
- Dado que o job falha para um usuário (chave inválida, Hevy fora do ar),
  quando isso acontece, então os outros usuários continuam sendo processados
  normalmente e o erro fica registrado em `hevy_connections.last_sync_error`
  para aparecer no card de integração da próxima vez que o usuário abrir.

## Fora do escopo

- Sincronização em tempo real ou por webhook (o Hevy não oferece webhook).
- Configurar horário customizado por usuário (todos no mesmo horário diário).
- Notificar o usuário ativamente quando o job roda (ele só vê o resultado ao
  abrir o card, via `last_synced_at`/`last_sync_status`).

## Impacto previsto

### Arquitetura

- Novo endpoint `/api/hevy-sync-cron.ts`, protegido por um segredo de cron
  (Vercel injeta `Authorization: Bearer $CRON_SECRET` nas chamadas agendadas;
  o endpoint rejeita qualquer chamada sem esse header, já que não pode exigir
  o token de um usuário autenticado como o endpoint manual exige).
- `vercel.json` ganha uma entrada `crons` apontando para esse endpoint com
  schedule diário (ex.: `0 6 * * *`, checar limite de execuções do plano
  Vercel em uso antes de fixar o horário).
- O endpoint itera todas as linhas de `hevy_connections`, chama a mesma lógica
  de paginação de `/api/hevy-sync` para cada `user_id`, um de cada vez (sem
  paralelismo, para não estourar rate limit do Hevy nem do Supabase) —
  reaproveitar `handleSync`/o núcleo de `api/hevy-sync.ts` como função
  compartilhada em vez de duplicar a lógica.
- `maxDuration` do endpoint de cron precisa acomodar N usuários × páginas cada
  — se a base crescer muito, considerar processar em lotes/paginado também
  entre usuários (não só entre páginas do Hevy).

### Domínio e banco

- Nenhuma tabela nova: reaproveita `hevy_connections`/`hevy_workout_imports`
  já existentes. `record_hevy_sync_result` já é o mesmo caminho de
  atualização usado pelo botão manual.

### Testes

- Unitário/integração: o loop de "processar todos os conectados" tolera falha
  de um usuário sem interromper os demais (mock de múltiplos usuários, um
  deles com chave inválida).
- Verificar manualmente que uma chamada sem o segredo de cron correto é
  rejeitada (evita que qualquer um dispare sincronização de todo mundo).

## Riscos e casos extremos

- Custo/limite de execuções de cron do plano Vercel em uso — checar antes de
  implementar (planos gratuitos podem limitar frequência ou quantidade de
  crons).
- Rate limit do Hevy se a base de usuários crescer — processar em série já
  mitiga, mas pode exigir um cron mais espaçado ou por lotes no futuro.
- Job automático rodando durante uma migração de banco em andamento — aceitar
  o risco por ora (mesma exposição que qualquer outra escrita concorrente já
  tem hoje).

## Verificação

- [ ] Critérios de aceite atendidos
- [ ] Autorização do endpoint de cron verificada (segredo obrigatório)
- [ ] Testes adicionados
- [ ] Quality gate executado
- [ ] ADR 0007 atualizada referenciando a implementação concluída
