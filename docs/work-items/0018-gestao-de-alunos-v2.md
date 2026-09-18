# Work item 0018 — Gestão de alunos v2

## Problema

Os vínculos e convites aparecem dentro do painel legado, sem busca, sinais de atenção
ou acesso a uma visão consolidada de cada aluno.

## Resultado esperado

Entregar uma área responsiva de alunos para o personal, usando dados existentes de
vínculo, aulas, créditos, pacotes e pagamentos. Cada aluno deve possuir um resumo
operacional e acesso a um perfil inicial.

## Requisitos relacionados

- RF-03 — Vínculo entre aluno e personal.
- RF-06 — Pacote de aulas.
- RF-15 — Extrato de créditos.
- RF-18 — Painel do personal.
- RF-21 — Dashboard operacional.
- RNF-01 — Mobile-first.
- RNF-05 — Acessibilidade.

## Critérios de aceite

- O personal visualiza apenas alunos com vínculo ativo.
- É possível buscar o aluno pelo nome.
- Filtros destacam alunos que precisam de atenção ou estão sem créditos.
- Cada linha informa frequência, saldo, próxima aula e situação financeira.
- O perfil individual consolida agenda, frequência, pacote e pagamento.
- Estados de carregamento, vazio e erro são explícitos.
- O fluxo existente de convite continua acessível durante a migração.

## Fora do escopo

- Persistência de metas, peso e fotos.
- Dados importados do Hevy.
- Encerramento do vínculo.
- Paginação no servidor.
