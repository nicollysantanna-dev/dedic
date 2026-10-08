# ADR 0012 — Catálogo só com GIF animado

- Status: aceita
- Data: 2026-10-07
- Responsáveis: Nicolly

## Contexto

A ADR 0011 trouxe o pacote de GIFs 3D, mas manteve os exercícios do
free-exercise-db sem par no pacote, com fotos de pessoas reais. O catálogo
ficou misturado: 604 exercícios com GIF e 592 só com foto (3 sem mídia
nenhuma), e vários pares com o mesmo movimento em versões diferentes
("Agachamento livre" com GIF e "Agachamento livre com barra" com foto).

A responsável pelo produto decidiu padronizar: o catálogo mostra apenas GIF
animado no estilo 3D, nunca foto ou vídeo de pessoa, até o Dedic ter um pacote
de exercícios próprio.

## Decisão

- **Aposentar** (`retired_at`) todo exercício global sem `animation_path`.
  Nada é apagado: fichas, treinos e históricos que já os usam continuam
  legíveis.
- **Duplicatas reais** (14, revisadas à mão a partir de nomes parecidos): o nome
  da versão com foto vira sinônimo da versão com GIF, para a busca continuar
  encontrando. Variações de verdade (inclinado × declinado, unilateral ×
  bilateral) não entram.
- **Banco**: a restrição `exercises_catalog_animated` impede exercício global
  ativo sem animação, inclusive em importações futuras.
- **Interface**: só aparecem imagens do catálogo em `gif-pack/`, e a
  demonstração é só o GIF. Exercício aposentado em ficha antiga mostra "Sem
  demonstração para este exercício." em vez das fotos.
- **free-exercise-db congelado**: não entram exercícios nem fotos novos. Os 275
  exercícios casados com GIF mantêm origem, `external_id` e instruções em
  inglês. O seed e os scripts continuam no repositório porque as migrações da
  ADR 0011 são geradas em cadeia a partir deles.

## Alternativas consideradas

### Aposentar só as duplicatas

Mantém o catálogo maior, mas continua misturando fotos de pessoas com GIF 3D.

### Apagar as fotos do bucket

Fica para depois: as fotos ainda são referenciadas por exercícios aposentados.
A interface já não as mostra, então a remoção pode ser feita sem pressa.

## Consequências

### Positivas

- Visual uniforme em todo o catálogo.
- A regra fica no banco, não só na interface.

### Negativas

- O catálogo cai de 1.196 para 604 exercícios. Alguns exercícios comuns não têm
  GIF no pacote (Flexão de braço, Puxada pegada neutra, Remada unilateral na
  polia, Ponte de glúteo com barra, Elevação de pernas na barra, Escada); quem
  precisar cria um exercício próprio até o pacote do Dedic existir.
- A importação do Hevy não casa com exercícios aposentados: um exercício sem
  equivalente animado vira exercício próprio do personal.

## Plano de retirada

Remover a restrição `exercises_catalog_animated`, limpar `retired_at` dos
exercícios aposentados nesta migração e voltar a aceitar caminhos fora de
`gif-pack/` em `catalogImages`.

## Validação

- `supabase/tests/090_exercise_catalog.sql`: catálogo ativo só com GIF,
  sinônimo das duplicatas e restrição no banco.
- `src/features/workouts/exercise-media.test.ts` e
  `ExerciseMediaLightbox.test.tsx`: nenhuma foto de pessoa na interface.
