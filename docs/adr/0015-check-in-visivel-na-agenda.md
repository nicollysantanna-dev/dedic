# ADR 0015 — Check-in visível na agenda

- Status: proposta
- Data: 2026-10-12
- Responsáveis: Nicolly

## Contexto

A agenda mostra aulas com o personal, mas não mostra os dias em que o aluno
treinou sozinho. O aluno quer acompanhar, pela agenda, quais dias treinou,
como o Hevy faz. O personal também precisa enxergar quando o aluno treinou,
mesmo sem aula naquele dia.

Hoje existe a view `student_check_ins` (ADR 0013), que marca um dia como
check-in quando há treino finalizado ou aula concluída. Ela guarda só o dia,
sem horário, então não basta para o card que se quer.

Restrições:

- A agenda é o ponto de entrada por data e aluno (ADR 0003). Não pode
  bloquear nem competir com aulas e horários livres.
- Dia sem treino não mostra nada. Não há indicador de "faltou".
- O conteúdo do treino (exercícios, séries, cargas) não aparece na agenda.
  Só o fato de ter treinado e o horário.
- Leitura pelo personal depende da RLS: `workouts_select` permite ao personal
  ativo ler os treinos dos alunos vinculados. Vínculo encerrado perde o acesso.

## Decisão proposta

Um check-in por treino finalizado, com o horário de início e fim, exibido como
um cartão pequeno no calendário. O cartão é só informativo:

- Aparece no dia do treino, na faixa de dia inteiro (acima da grade de horas),
  com o texto `Treino · 07:10–08:05`.
- Em visão mensal, aparece como chip no dia.
- Não é arrastável, não bloqueia seleção de horários e não abre nada por
  enquanto. Um clique futuro pode abrir o resumo pós-treino, em item separado.
- Para o aluno, mostra o próprio treino. Para o personal, mostra o nome do
  aluno antes do horário, porque a agenda dele reúne vários alunos.
- Treinos em andamento, descartados ou sem data de fim não aparecem.

Dados: a consulta lê `workouts` (início, fim, aluno), não a view de dia, e
respeita a RLS existente. Nada novo no banco por enquanto.

## Alternativas consideradas

### A. Dia pintado de verde (implementação provisória)

Fundo verde no dia inteiro, sem horário. Simples e já está no working tree
como teste de caminho, mas não traz o horário nem diferencia treinos do dia.
Não é a versão final.

### B. Cartão na grade de horas

Um evento de horário no intervalo do treino. É o mais fiel ao cartão de aula,
mas compete visualmente com aulas do mesmo horário, ocupa a grade que o aluno
usa para agendar e exige tratar sobreposição. Não recomendo.

### C. Chip na faixa de dia inteiro (recomendada)

Mantém o horário, não invade a grade e funciona na visão mensal. Os treinos do
dia empilham na faixa, o que combina com a leitura rápida do Hevy.

## Consequências

### Positivas

- O personal vê treino sem aula, sem nova tela.
- Nenhuma informação de conteúdo do treino na agenda.
- Não altera a regra de agendamento nem a RLS.

### Negativas

- Cada treino vira uma consulta a mais no período, então é preciso limitar a
  faixa consultada à visão atual.
- Na agenda do personal com muitos alunos, a faixa pode lotar. Pode ser preciso
  agrupar ou mostrar iniciais.
- Treino que atravessa a meia-noite cai em um dia só. Vale definir a regra.

## Perguntas em aberto

1. Na agenda do personal, mostrar o nome completo ou só as iniciais do aluno?
2. Treinos sem aula, mas feitos com um personal vinculado, contam como check-in
   separado do que o aluno faz sozinho? Hoje o `student_check_ins` não distingue.
3. Treino que passa da meia-noite: aparece no dia de início (proposta) ou é
   partido?
4. O cartão deve ter ação ao clicar (resumo pós-treino) já nesta etapa, ou só
   depois?
5. A visão mensal do personal mostra chip por aluno ou um total do dia?

## Validação

- Aluno com treino finalizado sem aula: o chip aparece com o horário certo nas
  visões dia, semana e mês, em celular e desktop.
- Personal com vínculo ativo vê o chip do aluno. Com vínculo encerrado, não
  vê nada (teste de banco com a RLS atual).
- Treino em andamento e treino descartado não aparecem.
- Dia sem treino continua sem qualquer marcação.
- Nenhum dado de exercício aparece no cartão.
