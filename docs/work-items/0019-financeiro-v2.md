# Work item 0019 — Financeiro v2

## Problema

O financeiro atual prioriza o formulário de pagamento e não oferece visão consolidada
de receita, valores a receber, inadimplência ou evolução mensal.

## Resultado esperado

Entregar um painel financeiro responsivo que apresente indicadores e movimentações
antes das ações de registro, mantendo a baixa manual existente.

## Requisitos relacionados

- RF-06 — Pacote de aulas.
- RF-17 — Pagamentos.
- RF-18 — Painel do personal.
- RF-25 — Gestão financeira consolidada.
- RNF-01 — Mobile-first.
- RNF-05 — Acessibilidade.

## Critérios de aceite

- O personal visualiza receita recebida, valores pendentes, atrasados e alunos pagos.
- A evolução dos últimos seis meses usa somente pagamentos com situação paga.
- A lista identifica aluno, vencimento, valor e situação.
- O formulário de registro abre sob demanda e continua permitindo edição.
- O aluno visualiza apenas os próprios pagamentos.
- Estados de carregamento, vazio, erro e sucesso permanecem explícitos.

## Fora do escopo

- Integração com Pix, cartão ou gateway de pagamento.
- Emissão de nota fiscal.
- Cobranças automáticas e mensagens por WhatsApp.
- Novos tipos de plano ou recorrência automática.
