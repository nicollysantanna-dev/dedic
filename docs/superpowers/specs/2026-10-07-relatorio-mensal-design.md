# Relatório mensal de check-ins — design

- Data: 2026-10-07
- Visão: [ADR 0013 — Gamificação do Dedic](../../adr/0013-gamificacao-do-dedic.md)
- Requisito: novo **RF-28 — Constância e relatório mensal** em
  `docs/MVP_REQUIREMENTS.md` (entra junto com a implementação)

## Objetivo

O aluno acompanha a própria constância no mês e, no fechamento, ganha um resumo
gamificado que quer compartilhar. O personal vê o mesmo relatório do aluno, só
leitura. Vocabulário (check-in, meta semanal, semana batida, sequência, medalha)
conforme a ADR 0013.

## Experiência

### Aluno

- **Card "Seu mês" na tela inicial**: check-ins do mês, sequência atual e
  próxima medalha; toque abre o relatório.
- **Relatório** em `/app/resumo` (mês atual) e `/app/resumo/AAAA-MM`, com
  seletor de mês do primeiro mês com check-in até o atual.
- **Mês em andamento**: título "Até agora", semana atual com quantos check-ins
  faltam para batê-la. Sem botão de compartilhar.
- **Mês fechado**: visão final e botão **Compartilhar**.
- **Notificação no dia 1**, só para quem teve pelo menos 1 check-in no mês
  anterior: "Seu resumo de setembro chegou 🎉", com link para o mês.

### Personal

- Seção **Relatório** na página do aluno (`/app/alunos/:studentId`) com os mesmos
  componentes, só leitura e sem compartilhar, enquanto o vínculo estiver ativo.

### Conteúdo do relatório

1. Cabeçalho: mês, nome do aluno, total de check-ins.
2. Calendário do mês: dias com check-in marcados; indicação discreta nos dias
   com aula; semanas batidas destacadas.
3. Sequência: atual e recorde.
4. Medalhas conquistadas no mês, em destaque, e a próxima medalha com progresso
   ("faltam 2 semanas para Sequência 8").
5. Aulas concluídas no mês.

### Estados

- Carregando.
- Sem check-ins: "Seu primeiro check-in acontece quando você finaliza um treino
  ou conclui uma aula."
- Erro, com tentar de novo.
- Mês em andamento e mês fechado.

## Regras

### Check-in

Dia (`America/Sao_Paulo`) com pelo menos um destes:

- treino com `finished_at` preenchido e `discarded_at` nulo, no dia de
  `started_at`;
- aula com `status = 'completed'`, no dia de `starts_at`.

No máximo um por dia; o dia guarda se teve treino, aula ou os dois.

### Semanas e sequência

- Semana: segunda a domingo. Semana do mês: aquela cuja segunda-feira cai no
  mês.
- Meta semanal: `target_value` da meta `attendance` ativa do aluno no momento do
  fechamento; sem meta, 3.
- O resultado de cada semana é gravado no fechamento (segunda às 03h de
  Brasília, referente à semana anterior), a partir da semana do primeiro
  check-in do aluno. Semana fechada não muda mais.
- Sequência atual: semanas batidas seguidas terminando na última semana fechada,
  mais 1 se a semana atual já foi batida.
- Recorde: maior sequência da história do aluno, incluindo a atual.

### Medalhas

| Código                                          | Nome                    | Tipo    | Regra                                                                                      |
| ----------------------------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `first_check_in`                                | Primeiro passo          | única   | primeiro check-in                                                                          |
| `streak_4`, `streak_8`, `streak_12`             | Sequência 4 / 8 / 12    | única   | sequência atinge 4, 8 ou 12 semanas                                                        |
| `check_ins_10`, `check_ins_50`, `check_ins_100` | 10 / 50 / 100 check-ins | única   | total de check-ins atinge o marco                                                          |
| `lessons_10`, `lessons_50`, `lessons_100`       | 10 / 50 / 100 aulas     | única   | total de aulas concluídas atinge o marco                                                   |
| `full_month`                                    | Mês completo            | por mês | todas as semanas do mês fechadas e batidas                                                 |
| `comeback`                                      | Volta por cima          | por mês | semana batida logo após uma semana não batida, tendo o aluno já batido alguma semana antes |
| `early_bird`                                    | Madrugador              | por mês | 5 check-ins no mês com treino ou aula começando antes das 7h                               |

- Medalha concedida não é revogada, mesmo que o treino ou a aula que a gerou
  deixe de contar.
- `earned_at` é o momento da concessão; medalhas por mês guardam o mês em
  `period_start` (único por aluno, código e período).
- Próxima medalha: entre as únicas ainda não conquistadas de sequência,
  check-ins e aulas, a de maior progresso percentual.

## Dados (banco)

- **`student_check_ins`** (view, `security_invoker`): `student_id`, `day`,
  `had_workout`, `had_lesson`, `early` (alguma atividade antes das 7h). Herda o
  RLS de `workouts` e `appointments`.
- **`student_week_results`** (tabela): `student_id`, `week_start`, `check_ins`,
  `target`, `met`, `closed_at`; chave (`student_id`, `week_start`). Sem
  update/delete.
- **`student_achievements`** (tabela): `id`, `student_id`, `code`,
  `period_start` (nulo nas únicas), `earned_at`; único por (`student_id`,
  `code`, `period_start`) com `nulls not distinct`. Sem update/delete.
- **`award_achievements(student_id)`**: `security definer`, idempotente; concede
  o que faltar. Chamada por gatilho quando um treino é finalizado ou uma aula
  passa a `completed`, depois do fechamento semanal e no fechamento mensal.
- **`close_weeks()`**: grava as semanas anteriores ainda não fechadas e chama
  `award_achievements`; `pg_cron` às segundas, 03h de Brasília.
- **`close_month()`**: concede `full_month` e cria a notificação
  (`notification_kind` novo `monthly_report`); `pg_cron` no dia 1, 03h30 de
  Brasília, depois de `close_weeks`.
- **`monthly_report(student_id, month)`**: RPC que devolve o JSON da tela: dias,
  semanas do mês com resultado, sequência atual e recorde, medalhas do mês,
  próxima medalha com progresso, aulas no mês, `in_progress`.

### Autorização

- Leitura: o próprio aluno; o personal com vínculo ativo com o aluno (mesmo
  critério da evolução física).
- Ninguém grava diretamente em `student_week_results` nem em
  `student_achievements`; RLS sem políticas de escrita.
- `monthly_report` recusa quem não pode ler o aluno.

## Interface (código)

`src/features/gamification/`:

- `queries.ts` e `keys.ts`: `monthly_report` via TanStack Query.
- `schemas.ts`: Zod do JSON da RPC.
- `achievement-catalog.ts`: código → nome, descrição e ícone (SVG simples e
  trocável até a direção visual 2D).
- `MonthlyReportPage.tsx`: orquestra a rota do aluno.
- `MonthlyReport.tsx`: corpo reutilizado pelo aluno e pelo personal
  (`readOnly`).
- `CheckInCalendar`, `StreakCard`, `AchievementList`, `NextAchievement`,
  `MonthSummaryCard` (card da home).
- `ShareCard.tsx` + `share-image.ts`: card 1080×1920 renderizado fora da tela,
  convertido em PNG com `html-to-image` e enviado por `navigator.share` com
  arquivo; sem suporte, o botão vira **Baixar imagem**. O card mostra só mês,
  nome, check-ins, calendário, sequência e medalhas do mês.

## Testes

- **Banco** (`supabase/tests/`): um check-in por dia com treino e aula no mesmo
  dia; treino às 23h30 de Brasília conta no dia local; treino descartado não
  conta; semana fechada usa a meta da época e não muda depois; meta padrão 3;
  sequência e recorde; cada medalha concedida uma vez (idempotência);
  `early_bird` e `comeback`; notificação só com check-in no mês; isolamento entre
  alunos; personal sem vínculo não lê; ninguém grava diretamente.
- **Unitários**: progresso da próxima medalha; rótulos de mês.
- **Testing Library**: estados do relatório; modo só leitura sem compartilhar;
  fallback para baixar sem `navigator.share`.
- **Playwright**: aluno finaliza um treino e vê o check-in em "Seu mês"; abre um
  mês fechado e compartilha (com `navigator.share` simulado); personal abre o
  relatório do aluno, sem compartilhar.

## Fora do escopo

Personagem e XP (nível 2), desafios, ranking, link público, arte 2D definitiva e
alertas novos para o personal.
