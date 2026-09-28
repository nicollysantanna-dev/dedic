# Auditoria mobile-first pós-integração com o Hevy

## Resultado esperado

Confiança de que o card de integração com o Hevy (Conta → Integrações), o
histórico de treinos e os recordes — incluindo os dados agora vindos do Hevy,
não só nativos — continuam respeitando a experiência mobile-first do resto do
Dedic, sem quebrar nada para quem usa o navegador do celular. Relevante agora
porque ainda não existe app nativo, que seria a forma mais confortável do
usuário final mexer nisso.

## Requisitos relacionados

- ADR 0007 (seção "Trabalho futuro").
- AGENTS.md — "Comece pela experiência de celular e valide também a versão
  desktop" e "Toda tela deve representar carregamento, vazio, erro e sucesso".

## Escopo da revisão

- `HevyIntegrationCard.tsx`: todos os estados (desconectado, conectando,
  conectado, sincronizando, erro, desconectar) em telas pequenas — toque,
  espaçamento, texto não cortado.
- `WorkoutHistorySection.tsx`/`WorkoutHistoryCard`: volume de itens agora
  maior (histórico do Hevy pode trazer dezenas/centenas de treinos de uma vez)
  — paginação (`Carregar mais sessões`) continua confortável, sem scroll
  excessivo nem travamento com listas grandes.
- Recordes (`ExerciseRecordsSection` e afins): selos de recorde vindos de
  treino importado aparecem do mesmo jeito visual que um recorde nativo, sem
  distinção confusa para o aluno.
- Perfil do aluno visto pelo personal (`StudentProfilePage`): treinos
  importados aparecem corretamente no histórico do personal, no mesmo padrão
  já corrigido para os treinos nativos.

## Fora do escopo

- Redesenho visual — é auditoria/ajuste pontual, não uma repaginação.
- Decisão sobre app nativo (ver conversa/registro em ADR futura, se a decisão
  amadurecer) — esta auditoria só garante que a experiência web atual não
  quebrou, independente dessa decisão.

## Achados e correções (2026-09-27)

Revisão de código feita com a conta Hevy real (73 treinos, dezenas de
exercícios distintos) como referência de volume:

- **Bug de dados** — `useWorkoutHistory` sempre buscava um limite fixo de 50
  treinos no servidor; "Carregar mais sessões" só revelava o que já tinha
  vindo, nunca buscava mais. Com a conta real (73 treinos), os 23 mais antigos
  ficavam permanentemente inacessíveis na tela. Corrigido para o limite
  crescer no servidor a cada clique (`workoutSessionKeys.history` agora inclui
  o limite na chave, `keepPreviousData` evita a lista sumir durante a busca).
  Teste de regressão em `WorkoutHistorySection.test.tsx` (comprovadamente
  falhava antes da correção).
- **Tela sem paginação** — `ExerciseRecordsSection` (aba Recordes, uso sem
  `limit`) renderizava todos os exercícios distintos do aluno de uma vez, sem
  nenhum corte. Aplicado o mesmo padrão de "Carregar mais" já usado no
  histórico. Teste em `ExerciseRecordsSection.test.tsx`.
- `HevyIntegrationCard` e a visão do personal (`StudentWorkoutsSummary`, que
  usa `limit={5}` nos dois componentes acima) revisados por código — sem
  achados; os dois só usam `limit` fixo, então não sofriam do bug acima.

## Verificação

- [ ] Testado em viewport de celular real ou emulado (não só desktop
      redimensionado) — revisão até aqui foi só por código, falta olhar num
      celular de verdade
- [x] Testado com uma conta com histórico grande (dezenas de treinos
      importados), não só com poucos registros
- [x] Estados de carregamento, vazio e erro revisados em cada tela do escopo
- [x] Nenhuma regressão nas jornadas já cobertas por Playwright (25/25
      passaram, incluindo as que exercitam histórico e recordes)
- [x] Quality gate executado (`format:check`, `lint`, `typecheck`, `test`,
      `build`)
