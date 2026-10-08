# ADR 0011 — GIFs animados no catálogo de exercícios

- Status: aceita; complementada pela ADR 0012 (catálogo só com GIF)
- Data: 2026-10-03
- Responsáveis: Nicolly

## Contexto

A ADR 0006 trocou o ExerciseDB pelo free-exercise-db: 876 exercícios com duas
fotos de pessoas reais, alternadas como animação. Faltam muitos exercícios de
academia brasileira (máquinas, polias, variações) e o visual é heterogêneo.

A responsável pelo produto comprou um pacote de GIFs de treino na Hotmart
("+1,5 mil GIFs") e decidiu usá-lo como fonte de demonstrações, padronizando o
catálogo no estilo 3D anatômico (fundo branco, músculo trabalhado em vermelho).
Só GIF animado interessa; foto ou vídeo de pessoa real fica de fora.

## Decisão

- **Fonte**: as 18 pastas numeradas por grupo muscular do pacote (817 arquivos).
  Descartados os estáticos (2) e as duplicatas (mesma animação com nomes
  diferentes, por hash perceptual de 8 quadros). Todos os animados restantes são
  do mesmo estilo 3D; nenhum é de pessoa real.
- **Classificação** (`supabase/seed/gif-pack.json`): cada GIF foi identificado
  pela imagem, não pelo nome do arquivo (o pacote tem nomes errados, genéricos
  e numerados). Recebe nome PT/EN, partes do corpo, equipamentos e músculos no
  vocabulário existente, e uma decisão:
  - `match`: é exatamente um exercício do free-exercise-db → a animação vai para
    esse exercício e a miniatura do GIF substitui as fotos;
  - `new`: vira exercício do catálogo com `source = 'gif_pack'` e
    `external_id = 'gif-pack:<slug>'`.
    Na dúvida, `new`: GIF errado num exercício existente é pior que um exercício a
    mais.
- **Mídia própria**: WebP animado (até 360 px, ~90 KB) e miniatura estática
  recortada (160 px) em `exercise-media/gif-pack/`, geradas por
  `scripts/convert-gif-pack.py` e enviadas por `scripts/sync-gif-pack-media.mjs`.
  Nada de chamada a terceiros no app. Os GIFs originais ficam fora do
  repositório.
- **Esquema**: `exercises.animation_path` (só catálogo, sempre em `gif-pack/`);
  `search_exercises` devolve a animação e ordena animados antes das fotos;
  `match_or_create_hevy_exercise` passa a considerar todo o catálogo global
  (`owner_id is null`) em vez de uma lista de origens.
- **Interface**: miniatura das listas continua sendo `image_paths[0]` (leve); o
  card e o lightbox mostram o WebP animado quando existe e, senão, alternam as
  fotos como antes.
- **Nomes dos personais** (`supabase/seed/exercise-names.pt-BR.json`): a lista
  de exercícios que os personais usam renomeia o catálogo para o vocabulário
  deles ("Tríceps pulley corda", "Leg press 45°"). `exercises.synonyms` guarda
  outros nomes do mesmo exercício ("Avanço" para "Passada") e o nome anterior,
  para a busca continuar encontrando; diferente de `exercise_aliases`, vale para
  todos. A busca põe primeiro o nome exato, principal ou sinônimo. Versões com
  foto de um exercício que já tem GIF (ou fotos repetidas) são aposentadas para
  não haver dois exercícios com o mesmo nome.

## Alternativas consideradas

### Só colocar GIF no catálogo atual

Menos mudança, mas só ~15–20% dos 876 exercícios teriam par no pacote e o resto
do pacote ficaria sem uso.

### Servir os GIFs por uma API própria

Custo e manutenção sem ganho: o bucket público com CDN já entrega mídia estática.

## Consequências

### Positivas

- Catálogo maior, com exercícios de academia brasileira e nomes em português.
- Demonstração animada de verdade, com o mesmo estilo em todo exercício que tem GIF.
- Fichas e treinos existentes continuam íntegros: nada é apagado.

### Negativas

- **Licença não verificada.** A página do pacote não diz nada sobre uso
  comercial ou em software, e o estilo é o do Gymvisual, que vende licenças
  próprias. A decisão foi seguir e regularizar se houver contestação.
- Exercícios do free-exercise-db sem par continuam com fotos de pessoas reais.
- Exercícios `gif_pack` não têm instruções.
- As migrações geradas se sobrepõem: free-exercise-db
  (`build-catalog-migration.mjs`), depois pacote de GIFs
  (`build-gif-pack-migration.mjs`), depois nomes dos personais
  (`build-exercise-names-migration.mjs`). Regenerar uma exige regenerar as
  seguintes, nessa ordem.

## Plano de retirada

Se for preciso retirar o pacote: uma migração que limpa `animation_path`,
restaura `image_paths` dos exercícios `free_exercise_db` a partir de
`supabase/seed/exercises.json` e aposenta (`retired_at`) os `gif_pack`, mais a
remoção da pasta `gif-pack/` do bucket. O app volta a mostrar as fotos no mesmo
deploy; fichas e históricos que usam exercícios `gif_pack` continuam legíveis.

## Validação

- `supabase/tests/090_exercise_catalog.sql` cobre catálogo, busca e animação.
- Revisar periodicamente exercícios `gif_pack` duplicados de free-exercise-db
  relatados por personais.
