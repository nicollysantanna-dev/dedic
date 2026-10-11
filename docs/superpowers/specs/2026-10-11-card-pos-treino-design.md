# Card compartilhável pós-treino — design

- Data: 2026-10-11
- Relacionados: [ADR 0013 — Gamificação](../../adr/0013-gamificacao-do-dedic.md),
  [spec do relatório mensal](2026-10-07-relatorio-mensal-design.md), RF-28 em
  `docs/MVP_REQUIREMENTS.md`

## Objetivo

Ao finalizar um treino, o aluno pode compartilhar um card do treino (estilo Hevy).
Quando o treino rende uma conquista, o card aparece sozinho para comemorar.
Junto, a meta semanal padrão passa de 3 para 5 check-ins.

## Experiência

### Tela "Treino finalizado!"

- O resumo atual continua (duração, séries, volume, recordes).
- Novo botão **Compartilhar** em todo treino finalizado pelo próprio aluno.
- Se houver **pelo menos uma** conquista, o card abre sozinho por cima do resumo,
  com **Compartilhar** e **Agora não**.
- Treino registrado pelo personal para o aluno: sem card automático e sem botão.

### Conquistas (basta uma para abrir o card)

1. **Semana batida:** este treino criou o check-in do dia e, com ele, a semana
   chegou à meta. Um segundo treino no mesmo dia não conta de novo.
2. **Medalha nova:** medalha concedida na finalização deste treino (inclui as
   mensais, como Madrugador).
3. **Recorde:** recorde em um exercício que **supera uma marca anterior** do aluno.
   Recorde de estreia (primeira vez no exercício) aparece no resumo, como hoje, mas
   não conta como conquista.

### Card (PNG 1080×1920, mesmo visual do card do mês)

- Faixa de título pela conquista principal, nesta prioridade: **MEDALHA NOVA!**,
  **SEMANA BATIDA!**, **RECORDE!**; sem conquista, **TREINO FEITO**.
- Nome do treino, data e nome do aluno (primeiro e último nome).
- Três números grandes: duração, volume e séries.
- Linha de conquistas com todas as que ocorreram (ex.: "Sequência 4 · Semana 5 de 5 ·
  2 recordes").
- Rodapé: "N de M check-ins nesta semana" e a frase final.
- Sem lista de exercícios, peso corporal, fotos ou dados do personal além da marca.
- Compartilha com `navigator.share`; sem suporte, baixa a imagem.

## Regras e dados

### `workout_summary(workout_id)` (RPC, `security definer`)

Devolve JSON com:

- `name`, `finished_at`, `duration_seconds`, `sets`, `volume_kg` (séries
  concluídas; volume pela mesma regra do resumo atual da sessão).
- `week`: `check_ins`, `target`, `met_now` (semana batida por este treino).
- `new_achievements`: códigos com `earned_at` igual ao `finished_at` do treino
  (a concessão roda na mesma transação de `finish_workout`).
- `records`: quantidade de exercícios com recorde que supera marca anterior.
- `recorded_by_student`: se o próprio aluno finalizou (o app usa para decidir se
  mostra o card).

Regra de `met_now`: o dia do treino (America/Sao_Paulo) não tinha outro treino
finalizado ou aula concluída antes deste, e os check-ins da semana com este dia
atingem a meta, enquanto sem ele ficariam abaixo.

Autorização: o próprio aluno e o personal com vínculo ativo; os demais recebem
`WORKOUT_ACCESS_DENIED`. Treino não finalizado recebe `WORKOUT_NOT_FINISHED`.

### Meta padrão 5

- `weekly_check_in_target` passa a devolver 5 quando não há meta de frequência ativa.
- Semanas já fechadas mantêm a meta gravada (imutáveis).
- Atualizar RF-28 e a spec do relatório mensal ("meta padrão 5").

## Interface (código)

`src/features/workouts/` (o card nasce da sessão de treino) reaproveitando a
gamificação:

- `workout-share.ts`: regras puras — título por prioridade, linha de conquistas.
- `WorkoutShareCard.tsx`: card 1080×1920 renderizado fora da tela.
- `WorkoutShareDialog.tsx`: diálogo com o card em miniatura, **Compartilhar** e
  **Agora não**.
- Hook `useWorkoutSummary` com a RPC; reaproveita `renderCardBlob` e `deliverCard`
  de `src/features/gamification/share-image.ts`.
- `WorkoutSessionPage`: após finalizar, consulta o resumo; abre o diálogo se houver
  conquista e o aluno for quem finalizou; botão Compartilhar sempre disponível
  para o aluno.

## Estados

- Carregando o resumo: o resumo atual aparece; o botão fica desabilitado até a
  resposta.
- Erro na RPC: resumo atual sem card e sem botão, com mensagem discreta.
- Falha ao gerar a imagem: mensagem "Não foi possível gerar a imagem. Tente
  novamente."

## Testes

- **Banco (pgTAP):** semana batida pelo treino certo; segundo treino no mesmo dia
  não conta; medalha nova pela finalização; recorde de estreia não conta e recorde
  que supera marca conta; meta padrão 5; autorização e treino não finalizado.
- **Unitários:** título por prioridade; linha de conquistas.
- **Testing Library:** diálogo abre sozinho com conquista e não abre sem conquista;
  personal não vê card nem botão.
- **Navegador (390 px):** gerar o PNG e conferir 1080×1920.

## Fora do escopo

Compartilhar treinos antigos do histórico, lista de exercícios no card, card para o
personal, ícones pixel art (seguem no item próprio).
