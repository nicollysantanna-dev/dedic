# Work item 0020 — Home e sessão do aluno v2

## Problema

A página inicial do aluno reutiliza uma agenda operacional antiga que também contém
lógica do personal. Isso cria excesso de ações, hierarquia visual inconsistente e
dificulta encontrar próxima aula, créditos, renovação e pagamento.

## Resultado esperado

Entregar uma Home exclusiva para o aluno, alinhada ao novo shell, com resumo do
pacote e atalhos para as áreas já existentes. Simplificar também a página de vínculo
com o personal.

## Requisitos relacionados

- RF-03 — Vínculo entre aluno e personal.
- RF-07 e RF-08 — Consulta e agendamento.
- RF-15 — Extrato de créditos.
- RF-17 — Pagamentos.
- RF-18 — Página inicial do aluno.
- RNF-01 — Mobile-first.

## Critérios de aceite

- A Home apresenta próxima aula, personal, créditos, aulas usadas, renovação e pagamento.
- O aluno acessa agendamento, agenda e financeiro por atalhos claros.
- A frequência usa apenas aulas realizadas e faltas, ignorando cancelamentos.
- Estados sem vínculo, sem pacote, carregamento e erro são explícitos.
- Nenhuma informação ou ação administrativa do personal é exibida ao aluno.

## Fora do escopo

- Persistência de metas, peso e fotos.
- Integração Hevy.
- Alteração das regras de crédito ou pagamento.
