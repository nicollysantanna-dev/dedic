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

## Verificação

- [ ] Testado em viewport de celular real ou emulado (não só desktop
      redimensionado)
- [ ] Testado com uma conta com histórico grande (dezenas de treinos
      importados), não só com poucos registros
- [ ] Estados de carregamento, vazio e erro revisados em cada tela do escopo
- [ ] Nenhuma regressão nas jornadas já cobertas por Playwright
- [ ] Quality gate executado
