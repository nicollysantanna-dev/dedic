# ADR 0007 — Integração com o Hevy: importação somente leitura de treinos realizados

- Status: proposta
- Data: 2026-09-23
- Responsáveis: Nic

## Contexto

A ADR 0006 rebaixou o Hevy a "Could" pós-MVP ao decidir construir treinos
nativos: o Dedic já cobre fichas, sessão com séries/carga/reps e histórico sem
depender de serviço externo. Ainda assim, muitos alunos e personais já têm
histórico de treino acumulado no Hevy e usam o app dele no dia a dia. Faz
sentido trazer esse histórico para dentro do Dedic sem reabrir a decisão de
não depender do Hevy para a experiência principal.

A API pública do Hevy (`api.hevyapp.com`) só é liberada para contas **Hevy
Pro**, por chave de API pessoal (`hevy.com/settings?developer`), e não tem
webhooks — apenas um endpoint de eventos para sincronização incremental por
polling. Ela é declarada estável, mas sem garantia de não mudar de estrutura.

O Dedic hoje não tem nenhum servidor próprio: é um front-end estático na
Vercel mais Postgres/Auth/Storage do Supabase, com toda regra de negócio em
funções do banco. Uma chave de API de terceiro não pode chegar ao navegador
(a política do projeto só permite `VITE_SUPABASE_URL` e a chave publicável em
variáveis `VITE_*`), então alguma peça precisa chamar o Hevy em nome do
usuário sem expor essa chave.

## Decisão

- O Hevy passa de "Could pós-MVP" para uma integração **opcional e somente
  leitura**: o Dedic nunca escreve de volta no Hevy.
- Cada usuário (personal ou aluno) que tiver Hevy Pro conecta sua própria
  conta em **Conta → Integrações**, informando a própria chave de API.
- A importação traz **apenas treinos já realizados** (`workouts`) na primeira
  versão. Rotinas/fichas do Hevy ficam fora de escopo por ora — o Dedic já
  tem fichas nativas, e importar rotina duplicaria um problema já resolvido.
- A chamada ao Hevy roda numa **função serverless na Vercel**
  (`/api/hevy-sync`, Node/TypeScript), não em `pg_net` nem em servidor à
  parte. Mantém o mesmo repositório e pipeline de deploy já existentes; a
  única infraestrutura nova é uma variável de ambiente secreta na Vercel
  (a `service_role` key do Supabase, que **nunca** vai para `VITE_*`).
- A chave do Hevy de cada usuário fica cifrada no Postgres via **Supabase
  Vault** (`supabase_vault`), nunca em texto plano numa coluna comum. Só uma
  função `security definer` restrita ao papel `service_role` consegue
  decifrá-la; o cliente autenticado nunca lê a chave de volta.
- A sincronização é **manual** (botão "Sincronizar agora"), sem tarefa
  agendada nesta primeira versão — evita a complexidade de rodar algo
  periódico sem um servidor de longa duração.
- Importação é idempotente por `hevy_workout_id`: rodar de novo não duplica
  treinos.
- Exercícios do Hevy são casados com o catálogo do Dedic por nome
  (similaridade de texto, o mesmo mecanismo já usado na busca do catálogo);
  sem correspondência, cria-se um exercício `custom` do próprio usuário — o
  mesmo caminho que já existe para exercícios criados manualmente.

## Alternativas consideradas

### Alternativa A — `pg_net` (tudo dentro do Postgres)

Chamada HTTP disparada por uma função do banco, resposta lida depois de uma
tabela interna do Postgres. Não exige nenhuma peça de deploy nova — cabe
exatamente no padrão atual (migração + SQL Editor). Descartada porque o fluxo
fica assíncrono por natureza (o botão "sincronizar" precisaria consultar
"já chegou?" repetidamente), o que complica a experiência para um ganho de
simplicidade que não compensa, já que a Vercel já hospeda o projeto.

### Alternativa B — Servidor próprio (Railway/Render/Fly.io)

Um processo Node/Express ou Python/FastAPI rodando part-time. Descartada por
somar uma conta, um deploy e um ponto de falha novos para monitorar, sem
ganho real sobre uma função serverless na própria Vercel.

## Consequências

### Positivas

- Nenhuma dependência do Hevy para o uso principal do Dedic; quem não tem
  Hevy Pro não perde nada.
- A chave de API nunca trafega para o navegador nem fica legível no banco.
- Reaproveita infraestrutura já paga e já usada (Vercel), sem novo provedor.

### Negativas

- Depende de uma API de terceiro sem garantia de estabilidade e atrás de
  assinatura paga (Hevy Pro) — cada usuário arca com esse custo, não o Dedic.
- Sincronização manual: sem tarefa agendada, o histórico só atualiza quando
  o usuário pedir.
- Casamento de exercícios por nome é heurístico; pode gerar exercícios
  `custom` duplicados quando o nome do Hevy diverge muito do catálogo.

## Validação

Testar primeiro com uma conta real (Hevy Pro do Nic): conectar, importar o
histórico existente, conferir que treinos, exercícios e séries aparecem
corretos no Dedic e que rodar a sincronização de novo não duplica nada.
