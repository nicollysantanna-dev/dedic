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
- **Notificação no fechamento do mês** (na segunda-feira em que a última semana
  do mês fecha), só para quem teve pelo menos 1 check-in no mês: "Seu resumo de
  setembro chegou 🎉", com link para o mês.

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

- Semana: segunda a domingo. Semana do mês: aquela cuja **quinta-feira** cai no
  mês (convenção ISO 8601), para cada semana pertencer a um só mês e o
  calendário mostrar as semanas do mês nas próprias linhas.
- Meta semanal: `target_value` da meta `attendance` ativa do aluno no momento do
  fechamento; sem meta, 3.
- O resultado de cada semana é gravado no fechamento (segunda às 03h de
  Brasília, referente à semana anterior), a partir da semana do primeiro
  check-in do aluno. Semana fechada não muda mais.
- Sequência atual: semanas batidas seguidas terminando na última semana fechada,
  mais 1 se a semana atual já foi batida.
- Recorde: maior sequência da história do aluno, incluindo a atual.
- **Fechamento do mês**: o mês fecha quando sua última semana fecha, isto é, na
  segunda-feira seguinte à semana da última quinta-feira do mês (entre o dia 1 e
  o dia 7 do mês seguinte). Só então o relatório deixa de estar em andamento.

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
- **`close_weeks()`**: grava as semanas anteriores ainda não fechadas, chama
  `award_achievements` (que concede `full_month` quando todas as semanas do mês
  estão fechadas e batidas) e, para cada mês que acabou de fechar, cria a
  notificação (`notification_kind` novo `monthly_report`); `pg_cron` às
  segundas, 03h de Brasília. Não há tarefa mensal separada.
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
- `achievement-catalog.ts`: código → nome, descrição e ícone em pixel art
  (SVG próprio, desenhado em grade de 16×16), concentrados aqui para serem
  trocáveis.
- `MonthlyReportPage.tsx`: orquestra a rota do aluno.
- `MonthlyReport.tsx`: corpo reutilizado pelo aluno e pelo personal
  (`readOnly`).
- `CheckInCalendar`, `StreakCard`, `AchievementList`, `NextAchievement`,
  `MonthSummaryCard` (card da home).
- `ShareCard.tsx` + `share-image.ts`: card 1080×1920 renderizado fora da tela,
  convertido em PNG com `html-to-image` e enviado por `navigator.share` com
  arquivo; sem suporte, o botão vira **Baixar imagem**.

### Card compartilhável

Referência visual: [docs/brand/relatorio-mensal-card.png](../../brand/relatorio-mensal-card.png).

- Pixel art 2D sobre azul-noite (`#090f1f`), faixa de título azul (`#2f6fed`),
  dias com check-in em verde (`#22c55e`), detalhes em dourado; fonte pixel nos
  títulos e números.
- De cima para baixo: marca Dedic; faixa de título; mês/ano e nome do aluno;
  número de check-ins; "N de M semanas batidas · meta Nx por semana";
  calendário com coluna **META** (bandeira nas semanas batidas) e estrela nos
  dias com aula; legenda; **linha com até 3 medalhas do mês** (as mais raras
  primeiro); frase final.
- Título: **"MÊS COMPLETO!"** quando todas as semanas do mês foram batidas;
  **"RESUMO DO MÊS"** caso contrário, com a faixa menos festiva.
- Calendário com 4 a 6 linhas, sempre com as semanas do mês (regra da
  quinta-feira); dias de outros meses aparecem vazios.
- Sem medalhas no mês, a linha mostra a próxima medalha com progresso.
- Nome do aluno: primeiro e último nome, cortado com reticências se não couber
  numa linha.
- Nada de peso, fotos, dados financeiros ou dados do personal além da marca
  Dedic.

## Testes

- **Banco** (`supabase/tests/`): um check-in por dia com treino e aula no mesmo
  dia; treino às 23h30 de Brasília conta no dia local; treino descartado não
  conta; semana fechada usa a meta da época e não muda depois; meta padrão 3;
  sequência e recorde; cada medalha concedida uma vez (idempotência);
  `early_bird` e `comeback`; semana pertence ao mês da sua quinta-feira; mês só
  fecha (e notifica) quando sua última semana fecha; notificação só com check-in no mês; isolamento entre
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
