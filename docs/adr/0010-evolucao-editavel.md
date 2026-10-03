# ADR 0010 — Evolução editável

- Status: aceita
- Data: 2026-10-03
- Responsáveis: Nicolly Cristine Santanna de Oliveira

## Contexto

Os registros de peso e medidas (`progress_entries`) nasceram imutáveis, no mesmo padrão do
extrato de créditos: correção era um novo registro. As metas (`student_goals`) só podiam
ter o estado alterado pelo personal. Na prática isso impedia corrigir um peso digitado
errado ou apagar um dado de saúde, e a política de privacidade não podia prometer que o
titular edita ou apaga os próprios dados (LGPD art. 18, III e VI).

Diferente de créditos e aulas, esses registros não sustentam saldo nem histórico de
negócio da outra parte: são dados do titular.

## Decisão

- Remover a imutabilidade de `progress_entries` (trigger e função
  `prevent_progress_entry_mutation`).
- Aluno e personal com vínculo ativo editam e excluem qualquer registro e meta do aluno.
  Personal sem vínculo ativo não altera nada; na meta, o personal precisa ser o da meta.
- Só os campos de conteúdo podem mudar (permissão por coluna): registro — data, peso,
  medidas, observação; meta — valor inicial, valor-alvo, prazo e estado. Aluno, autor
  original e personal da meta ficam fixos.
- `progress_entries.updated_at`/`updated_by` e `student_goals.updated_at`/`updated_by`,
  preenchidos por trigger, guardam a última alteração. Editar e excluir não geram
  notificação.
- A permissão de UPDATE existe só por coluna: a migração revoga explicitamente o UPDATE da
  tabela inteira para não depender dos privilégios padrão do projeto (pgTAP confere).
- Notificações de registro de progresso e de meta nova não copiam valores de saúde (só
  "registrou progresso" / "nova meta"), e os valores já gravados foram limpos — assim a
  edição, a exclusão ou a exclusão da conta não deixam cópias nas notificações da outra parte.
- A tela de evolução ganha o histórico de registros com Editar/Excluir e ações de
  Editar/Excluir em cada meta; exclusão sempre pede confirmação.
- A política de privacidade passa a dizer que o titular pode editar ou apagar esses dados a
  qualquer momento.

## Alternativas consideradas

### Manter imutável e corrigir com novo registro

Preserva o histórico completo, mas não permite apagar um dado de saúde nem corrigir um erro
sem poluir o gráfico, e a política teria que restringir o direito de eliminação.

### Só o autor edita

Evita que uma parte altere o que a outra registrou, mas o aluno, titular dos dados, ficaria
dependente do personal para apagar registros feitos por ele.

## Consequências

### Positivas

- Correção e eliminação de dados de saúde pelo próprio app.
- O texto da política corresponde ao que o sistema permite.

### Negativas

- Perde-se o histórico de versões: só a última alteração tem autor e data registrados, e
  uma exclusão não deixa rastro.
- Uma parte pode alterar o que a outra registrou.
- A exceção por GUC (`dedic.account_deletion`) da ADR 0008 deixa de ser necessária para
  `progress_entries`; continua valendo para a trava de aula no mesmo dia.

## Validação

pgTAP `062_progress_edit_delete.sql` cobre edição e exclusão por aluno e personal vinculado,
bloqueio sem vínculo, campos fixos e autoria; Testing Library cobre histórico e metas; a
jornada E2E de evolução edita peso e meta e exclui registro e meta.
